import io
import json
import sqlite3
import openai
import time
import requests
import fitz
import re
import asyncio
import zipfile
import os
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from passlib.context import CryptContext
from typing import Optional
from cryptography.fernet import Fernet
from dotenv import load_dotenv

load_dotenv(dotenv_path=".env")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# ==========================================
# 🔐 ระบบรักษาความปลอดภัย API Key
# ==========================================
SECRET_KEY = os.getenv("SECRET_KEY")
cipher_suite = Fernet(SECRET_KEY)

def encrypt_data(text: str):
    if not text: return ""
    return cipher_suite.encrypt(text.encode()).decode()

def decrypt_data(cipher_text: str):
    if not cipher_text: return ""
    try:
        return cipher_suite.decrypt(cipher_text.encode()).decode()
    except Exception as e:
        print(f"Decryption Error: {e}")
        return ""

MINERU_API_TOKEN = os.getenv("API_KEY")

TEMP_FILES = {}

# ==========================================
# 🧠 ระบบแก้คำเพี้ยน (OCR Fixer)
# ==========================================
def fix_thai_text(text):
    if not text:
        return ""
        
    text = text.replace('\u200b', '')
    
    alien_map = {
        'ü': 'ว', 'ÿ': 'ส', 'Ā': 'ห', 'ý': 'ศ', 'þ': 'ษ',
        '': '์', '': '้', '': '่', '': '้', 'ผู': 'ผู้',
        '': 'ี', '': '็', '': '์', '': 'ั', 
        r'$\Im ^ { \cdot }$': 'รู' 
    }
    for alien, thai in alien_map.items():
        text = text.replace(alien, thai)
        
    swap_words = {
        'ปรญิ': 'ปริญ', 'สตู ร': 'สูตร', 'สตูร': 'สูตร', 'ณฑติ': 'ณฑิต',
        'วทิ ย': 'วิทย', 'เทคนคิ': 'เทคนิค', 'ขอ้ ': 'ข้อ ', 'ตา่ ง': 'ต่าง',
        'ตําแหนง่': 'ตําแหน่ง', 'แอปพลิเคชนั': 'แอปพลิเคชัน', 'ดจิิทัล': 'ดิจิทัล',
        'ชาติสริิ': 'ชาติสิริ', 'มนัยสําคัญ': 'มีนัยสําคัญ'
    }
    for wrong, right in swap_words.items():
        text = text.replace(wrong, right)
        
    text = text.replace('าํ', 'ำ')
    text = re.sub(r'\s+([ะาำิีึืุูั็่้๊๋์])', r'\1', text)
    
    text = text.replace(" ำ", "###AM###")
    text = text.replace("ำ", "า")
    text = text.replace("###AM###", "ำ")
    
    text = text.replace("ทั่งการ", "ทั้งการ")
    text = text.replace("ทั่งที่", "ทั้งที่")
    text = text.replace("ทั่งนี้", "ทั้งนี้")
    
    text = re.sub(r' {2,}', ' ', text)
    return text.strip()

def extract_text_pymupdf_advanced(content):
    try:
        doc = fitz.open(stream=content, filetype="pdf")
        md_content = ""
        for page in doc:
            blocks = page.get_text("dict").get("blocks", [])
            text_blocks = [b for b in blocks if b.get('type') == 0]
            text_blocks.sort(key=lambda b: (b['bbox'][1], b['bbox'][0]))
            
            for block in text_blocks:
                block_text = ""
                for line in block.get("lines", []):
                    line_text = ""
                    for span in line.get("spans", []):
                        text = span.get("text", "")
                        line_text += text
                    block_text += line_text + " "
                block_text = re.sub(r'\s+', ' ', block_text).strip()
                if block_text:
                    md_content += block_text + "\n\n"
        return fix_thai_text(md_content)
    except Exception as e:
        print(f"❌ PyMuPDF Error: {e}")
        return ""

# ==========================================
# 🗄️ การตั้งค่า Database & Dynamic Rubrics
# ==========================================
def init_db():
    conn = sqlite3.connect('database.db')
    cursor = conn.cursor()
    cursor.execute('PRAGMA journal_mode=WAL;')
    
    cursor.execute('''CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT UNIQUE, password TEXT)''')
    cursor.execute('''CREATE TABLE IF NOT EXISTS evaluation_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, user_email TEXT, filename TEXT, project_type TEXT, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP, results TEXT, extracted_text TEXT)''')
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS rubrics (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT,
            version INTEGER,
            rubric_data TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    try: cursor.execute("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'student'")
    except sqlite3.OperationalError: pass 
    try: cursor.execute("ALTER TABLE users ADD COLUMN api_key TEXT")
    except sqlite3.OperationalError: pass
    try: cursor.execute("ALTER TABLE users ADD COLUMN base_url TEXT")
    except sqlite3.OperationalError: pass
    try: cursor.execute("ALTER TABLE evaluation_logs ADD COLUMN zip_url TEXT")
    except sqlite3.OperationalError: pass
    try: cursor.execute("ALTER TABLE evaluation_logs ADD COLUMN rubric_id INTEGER")
    except sqlite3.OperationalError: pass
    
    cursor.execute("SELECT COUNT(*) FROM rubrics")
    if cursor.fetchone()[0] == 0:
        try:
            with open('rubric.json', 'r', encoding='utf-8') as f:
                data = f.read()
                cursor.execute("INSERT INTO rubrics (title, version, rubric_data) VALUES (?, ?, ?)", ("สอบเค้าโครง (Proposal)", 1, data))
                print("✅ นำเข้าข้อมูล Rubric เดิมเข้าสู่ Database สำเร็จ!")
        except FileNotFoundError:
            pass
            
    conn.commit()
    conn.close()

init_db()

# --- Auth & Models ---
class UserRegister(BaseModel):
    email: str
    password: str
    full_name: Optional[str] = "Student"

class RubricSaveRequest(BaseModel):
    email: str
    title: str
    rubric_data: dict

@app.post("/register")
async def register(user: UserRegister):
    conn = sqlite3.connect('database.db')
    cursor = conn.cursor()
    hashed_password = pwd_context.hash(user.password)
    user_role = 'teacher' if user.email == 'teacher@kku.ac.th' else 'student'
    try:
        cursor.execute("INSERT INTO users (email, password, role) VALUES (?, ?, ?)", (user.email, hashed_password, user_role))
        conn.commit()
    except sqlite3.IntegrityError:
        conn.close()
        raise HTTPException(status_code=400, detail="อีเมลนี้มีในระบบแล้ว")
    except Exception as e:
        conn.close()
        raise HTTPException(status_code=500, detail=f"เกิดข้อผิดพลาด: {str(e)}")
    conn.close()
    return {"message": "สมัครสมาชิกสำเร็จ"}

@app.post("/token")
async def login(username: str = Form(...), password: str = Form(...)):
    conn = sqlite3.connect('database.db')
    cursor = conn.cursor()
    cursor.execute("SELECT password, role FROM users WHERE email = ?", (username,))
    record = cursor.fetchone()
    conn.close()
    if not record or not pwd_context.verify(password, record[0]):
        raise HTTPException(status_code=400, detail="อีเมลหรือรหัสผ่านไม่ถูกต้อง")
    return {"access_token": username, "token_type": "bearer", "role": record[1] if record[1] else "student"}

# ==========================================
# 📊 API สำหรับจัดการ Dynamic Rubrics
# ==========================================
@app.get("/rubrics")
async def get_all_rubrics():
    conn = sqlite3.connect('database.db')
    cursor = conn.cursor()
    cursor.execute("SELECT id, title, version, created_at FROM rubrics ORDER BY title, version DESC")
    rows = cursor.fetchall()
    conn.close()
    return [{"id": r[0], "title": r[1], "version": r[2], "date": r[3]} for r in rows]

@app.get("/rubric/{rubric_id}")
async def get_rubric_by_id(rubric_id: int):
    conn = sqlite3.connect('database.db')
    cursor = conn.cursor()
    cursor.execute("SELECT title, version, rubric_data FROM rubrics WHERE id = ?", (rubric_id,))
    row = cursor.fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="ไม่พบเกณฑ์การประเมินนี้")
    return {"title": row[0], "version": row[1], "rubric_data": json.loads(row[2])}

@app.post("/rubric")
async def save_new_rubric_version(req: RubricSaveRequest):
    conn = sqlite3.connect('database.db')
    cursor = conn.cursor()
    cursor.execute("SELECT role FROM users WHERE email = ?", (req.email,))
    record = cursor.fetchone()
    
    if not record or record[0] != 'teacher':
        conn.close()
        raise HTTPException(status_code=403, detail="ไม่มีสิทธิ์แก้ไข (เฉพาะอาจารย์เท่านั้น)")
        
    cursor.execute("SELECT MAX(version) FROM rubrics WHERE title = ?", (req.title,))
    max_ver = cursor.fetchone()[0]
    new_version = (max_ver or 0) + 1
    
    try:
        cursor.execute("INSERT INTO rubrics (title, version, rubric_data) VALUES (?, ?, ?)", 
                       (req.title, new_version, json.dumps(req.rubric_data, ensure_ascii=False)))
        conn.commit()
        return {"message": f"บันทึก '{req.title}' เวอร์ชัน {new_version} เรียบร้อยแล้ว"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"เกิดข้อผิดพลาดในการบันทึก: {str(e)}")
    finally:
        conn.close()

@app.delete("/rubric/{rubric_id}")
async def delete_rubric(rubric_id: int, email: str):
    conn = sqlite3.connect('database.db')
    cursor = conn.cursor()
    
    cursor.execute("SELECT role FROM users WHERE email = ?", (email,))
    record = cursor.fetchone()
    
    if not record or record[0] != 'teacher':
        conn.close()
        raise HTTPException(status_code=403, detail="ไม่มีสิทธิ์ลบ (เฉพาะอาจารย์เท่านั้น)")
        
    try:
        cursor.execute("DELETE FROM rubrics WHERE id = ?", (rubric_id,))
        conn.commit()
        return {"message": "ลบเวอร์ชันนี้เรียบร้อยแล้ว"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"เกิดข้อผิดพลาดในการลบ: {str(e)}")
    finally:
        conn.close()

# --- API Settings ---
class ApiSettingReq(BaseModel):
    email: str
    api_key: str
    base_url: str

@app.post("/api-settings")
async def save_api_settings(req: ApiSettingReq):
    encrypted_key = encrypt_data(req.api_key)
    conn = sqlite3.connect('database.db')
    cursor = conn.cursor()
    cursor.execute("UPDATE users SET api_key = ?, base_url = ? WHERE email = ?", (encrypted_key, req.base_url, req.email))
    conn.commit()
    conn.close()
    return {"message": "บันทึกการตั้งค่า API สำเร็จและเข้ารหัสเรียบร้อยแล้ว"}

@app.get("/api-settings/{email}")
async def get_api_settings(email: str):
    conn = sqlite3.connect('database.db')
    cursor = conn.cursor()
    cursor.execute("SELECT api_key, base_url FROM users WHERE email = ?", (email,))
    record = cursor.fetchone()
    conn.close()
    if not record:
        return {"base_url": "https://gen.ai.kku.ac.th/api/v1", "api_key": "", "has_key": False}
    enc_key, base_url = record
    decrypted_key = decrypt_data(enc_key) if enc_key else ""
    masked_key = ""
    if decrypted_key and len(decrypted_key) > 8:
        masked_key = decrypted_key[:4] + "..." + decrypted_key[-4:]
    elif decrypted_key:
        masked_key = "********"
    return {"base_url": base_url or "https://gen.ai.kku.ac.th/api/v1", "api_key": masked_key, "has_key": bool(decrypted_key)}

# --- Evaluation APIs ---
@app.post("/evaluate/start-mineru")
async def evaluate_start_mineru(file: UploadFile = File(...)):
    content = await file.read()
    base_url = "https://mineru.net/api/v4"
    headers = {"Authorization": f"Bearer {MINERU_API_TOKEN}"}
    try:
        req_data = {"files": [{"name": file.filename}]}
        res = requests.post(f"{base_url}/file-urls/batch", headers=headers, json=req_data, timeout=10)
        res_json = res.json()
        if res_json.get('code') != 0: raise Exception("MinerU API Request URL Error")
        data = res_json.get('data', {})
        batch_id = data.get('batch_id')
        upload_url = data.get('file_urls', [])[0]
        requests.put(upload_url, data=content).raise_for_status()
        TEMP_FILES[batch_id] = content
        return {"batch_id": batch_id, "status": "started"}
    except Exception as e:
        txt = extract_text_pymupdf_advanced(content)
        return {"batch_id": "fallback", "status": "completed", "text": txt}

@app.get("/evaluate/check-mineru/{batch_id}")
async def evaluate_check_mineru(batch_id: str):
    if batch_id == "fallback":
        return {"status": "completed", "text": extract_text_pymupdf_advanced(TEMP_FILES.get(batch_id, b"")), "zip_url": ""}
        
    base_url = "https://mineru.net/api/v4"
    headers = {"Authorization": f"Bearer {MINERU_API_TOKEN}"}
    poll_url = f"{base_url}/extract-results/batch/{batch_id}"
    
    try:
        res = requests.get(poll_url, headers=headers, timeout=10)
        if res.status_code == 200:
            poll_data = res.json()
            if poll_data.get('code') == 0:
                extract_res = poll_data.get('data', {}).get('extract_result', [])
                if extract_res:
                    item = extract_res[0]
                    state = item.get('state')
                    if state in ['done', 'success']:
                        markdown_url = item.get('markdown_url')
                        full_zip_url = item.get('full_zip_url') 
                        
                        if markdown_url:
                            md_res = requests.get(markdown_url)
                            cleaned_text = fix_thai_text(md_res.text) 
                            TEMP_FILES.pop(batch_id, None) 
                            return {"status": "completed", "text": cleaned_text, "zip_url": full_zip_url or ""}
                            
                        elif full_zip_url:
                            zip_res = requests.get(full_zip_url)
                            with zipfile.ZipFile(io.BytesIO(zip_res.content)) as z:
                                md_files = [f for f in z.namelist() if f.endswith('.md')]
                                if md_files:
                                    md_text = z.read(md_files[0]).decode('utf-8')
                                    cleaned_text = fix_thai_text(md_text)
                                    TEMP_FILES.pop(batch_id, None) 
                                    return {"status": "completed", "text": cleaned_text, "zip_url": full_zip_url}
                                    
                        content = TEMP_FILES.pop(batch_id, None)
                        txt = extract_text_pymupdf_advanced(content) if content else ""
                        return {"status": "completed", "text": txt, "zip_url": ""}
                        
                    elif state == 'failed':
                        content = TEMP_FILES.pop(batch_id, None)
                        txt = extract_text_pymupdf_advanced(content) if content else ""
                        return {"status": "completed", "text": txt, "zip_url": ""}
    except Exception as e:
        print(f"🚨 Polling Error: {e}")
        
    return {"status": "processing"}

@app.post("/evaluate/run-ai")
async def evaluate_run_ai(
    extracted_text: str = Form(...),
    project_type: str = Form(...),
    models: str = Form(...),
    user_email: str = Form(...),
    filename: str = Form(...),
    zip_url: str = Form(""),
    rubric_id: int = Form(1)
):
    selected_models = json.loads(models)
    if not extracted_text:
        extracted_text = "🚨 ไม่พบเนื้อหาข้อความ"

    conn = sqlite3.connect('database.db')
    cursor = conn.cursor()
    cursor.execute("SELECT api_key, base_url FROM users WHERE email = ?", (user_email,))
    record = cursor.fetchone()

    if not record or not record[0]:
        conn.close()
        return {"status": "error", "message": "ไม่พบ API Key ในระบบ กรุณาตั้งค่า API Key ในเมนู Settings ก่อนใช้งาน"}

    real_api_key = decrypt_data(record[0])
    student_base_url = record[1] or "https://gen.ai.kku.ac.th/api/v1"

    cursor.execute("SELECT rubric_data FROM rubrics WHERE id = ?", (rubric_id,))
    rubric_row = cursor.fetchone()
    conn.close()

    if not rubric_row:
         return {"status": "error", "message": "ไม่พบเกณฑ์การประเมินในระบบ กรุณาเลือกรูบริกให้ถูกต้อง"}
    
    RUBRIC_DATA = json.loads(rubric_row[0])

    try:
        client = openai.OpenAI(api_key=real_api_key, base_url=student_base_url)
    except Exception as e:
        return {"status": "error", "message": f"ไม่สามารถเชื่อมต่อ AI Provider ได้ ({str(e)})"}

    results = []
    rubric_text = ""
    for cat, subs in RUBRIC_DATA.items():
        sub_items = subs.get(project_type, {}) if cat == "วิธีการดำเนินงาน" else subs
        for sub, criteria in sub_items.items():
            criteria_str = ""
            if isinstance(criteria, dict):
                c4 = criteria.get('4', '')
                c3 = criteria.get('3', '')
                c2 = criteria.get('2', '')
                c1 = criteria.get('1', '')
                criteria_str = f"คะแนน 4: {c4} | คะแนน 3: {c3} | คะแนน 2: {c2} | คะแนน 1: {c1}"
            else:
                criteria_str = str(criteria)
                
            rubric_text += f"หมวด: '{cat}', หัวข้อ: '{sub}', เกณฑ์: '{criteria_str}'\n"

    for m_alias in selected_models:
        m_id = {"ChatGPT": "gpt-5.2", "Gemini": "gemini-3-pro-preview", "DeepSeek": "deepseek-v3.2"}.get(m_alias, "gpt-5.2")
        
        processed_text = extracted_text
        ref_keywords = ["\n11. เอกสารอ้างอิง", "\nเอกสารอ้างอิง", "\nบรรณานุกรม", "\nReferences"]
        for kw in ref_keywords:
            if kw in processed_text:
                processed_text = processed_text.split(kw)[0]
                break
                
        safe_txt = processed_text[:45000] 

        prompt = f"""คุณคือผู้เชี่ยวชาญการตรวจโครงงานวิทยาการคอมพิวเตอร์
        ให้ประเมินเอกสารต่อไปนี้ ตาม "เกณฑ์การประเมินทุกข้อ" ที่กำหนดให้
        
        [คำสั่งพิเศษดักทาง (Guardrails)]
        1. ตรวจสอบประเภทเอกสาร: หากเอกสารนี้ "ไม่ใช่โครงงานหรือ Proposal" ให้ประเมินคะแนนเป็น 0 ทุกหัวข้อ และตอบเหตุผลว่า 'เอกสารนี้ไม่ใช่โครงงาน ไม่สามารถประเมินได้'
        2. กฎการให้คะแนนขั้นต่ำ: หากเอกสารนี้ "เป็นโครงงานหรือ Proposal" แต่หัวข้อที่ประเมินขาดหายไป, เขียนไม่ครบ, หรือไม่พบเนื้อหา ให้ให้คะแนนขั้นต่ำคือ 1 (ห้ามให้ 0 เด็ดขาด)
        3. ในเอกสารอาจใช้คำว่า "วิธีดำเนินการวิจัย" ให้ถือว่าเป็นส่วนเดียวกันกับเกณฑ์หัวข้อ "วิธีการดำเนินงาน"
        4. กฎเหล็ก JSON: ในช่องข้อความ (reason, evidence, suggestion) ห้ามใช้เครื่องหมาย Double Quote (") ซ้อนข้างในเด็ดขาด หากต้องการเน้นคำให้ใช้ Single Quote (') แทนเท่านั้น
        
        [เนื้อหาเอกสาร]
        ---
        {safe_txt} 
        ---
        
        [เกณฑ์การประเมินทั้งหมด]
        {rubric_text}
        
        [คำสั่ง]
        ให้ประเมินทุกหัวข้อตามเกณฑ์ที่ให้ไว้ แล้วตอบกลับเป็น JSON Array โครงสร้างดังนี้เท่านั้น:
        {{
            "evaluations": [
                {{
                    "main_criteria": "ชื่อหมวด",
                    "sub_criteria": "ชื่อหัวข้อ",
                    "score": (คะแนน 1-4 เท่านั้น แต่ถ้าเอกสารไม่ใช่โครงงานเลยให้ใส่ 0),
                    "reason": "เหตุผลการให้คะแนนอย่างละเอียด",
                    "evidence": "คัดลอกประโยคจากเอกสารที่ใช้อ้างอิง (ถ้าไม่พบให้ระบุว่า 'ไม่พบเนื้อหาที่เกี่ยวข้องในเอกสาร')",
                    "suggestion": "คำแนะนำเพื่อพัฒนา"
                }}
            ]
        }}"""
        
        try:
            print(f"🤖 กำลังส่งให้ {m_alias} ประเมิน...")
            response = client.chat.completions.create(
                model=m_id,
                messages=[{"role": "user", "content": prompt}],
                response_format={"type": "json_object"}
            )
            
            raw_content = response.choices[0].message.content
            
            if raw_content.strip().startswith("<!DOCTYPE") or "<html" in raw_content.lower():
                print(f"⚠️ {m_alias} แจ้งเตือน: เซิร์ฟเวอร์ต้นทาง (KKU Gateway) ปิดปรับปรุง หรือขัดข้อง (พบ HTML)")
                continue
                
            clean_content = raw_content.replace("```json", "").replace("```", "").strip()
            eval_res = json.loads(clean_content, strict=False)
            
            for item in eval_res.get("evaluations", []):
                results.append({
                    "model": m_alias, 
                    "main_criteria": item.get("main_criteria", ""), 
                    "sub_criteria": item.get("sub_criteria", ""),
                    "score": item.get("score", 0), 
                    "reason": item.get("reason", ""),
                    "evidence": item.get("evidence", "ไม่พบหลักฐานในเอกสาร"),
                    "suggestion": item.get("suggestion", "")
                })
            
        except json.JSONDecodeError:
            print(f"🚨 {m_alias} ส่งข้อมูลกลับมาผิดรูปแบบ (ไม่ใช่ JSON) ทำการข้าม...")
            continue
        except Exception as e:
            print(f"🚨 ❌ {m_alias} เกิดข้อผิดพลาด: {str(e)} ทำการข้าม...")
            continue

    conn = sqlite3.connect('database.db')
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO evaluation_logs (user_email, filename, project_type, results, extracted_text, zip_url, rubric_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
        (user_email, filename, project_type, json.dumps(results, ensure_ascii=False), extracted_text, zip_url, rubric_id) 
    )
    conn.commit()
    conn.close()

    return {"status": "success", "results": results, "extracted_text": extracted_text}

@app.get("/history/{email}")
async def get_history(email: str):
    conn = sqlite3.connect('database.db')
    cursor = conn.cursor()
    cursor.execute("""
        SELECT e.id, e.filename, e.project_type, e.timestamp, e.results, e.extracted_text, r.version 
        FROM evaluation_logs e
        LEFT JOIN rubrics r ON e.rubric_id = r.id
        WHERE e.user_email = ? 
        ORDER BY e.timestamp DESC
    """, (email,))
    rows = cursor.fetchall()
    conn.close()
    return [{
        "id": r[0], 
        "filename": r[1], 
        "project_type": r[2], 
        "date": r[3], 
        "results": json.loads(r[4]), 
        "extracted_text": r[5],
        "rubric_version": r[6] or 1
    } for r in rows]

# ==========================================
# 👨‍🏫 API สำหรับหน้า Dashboard ของอาจารย์
# ==========================================
@app.get("/teacher/history/all")
async def get_all_history(teacher_email: str):
    conn = sqlite3.connect('database.db')
    cursor = conn.cursor()
    cursor.execute("SELECT role FROM users WHERE email = ?", (teacher_email,))
    record = cursor.fetchone()
    if not record or record[0] != 'teacher':
        conn.close()
        raise HTTPException(status_code=403, detail="ไม่อนุญาตให้เข้าถึงข้อมูลนี้ (เฉพาะอาจารย์)")
        
    cursor.execute("""
        SELECT e.id, e.user_email, e.filename, e.project_type, e.timestamp, e.results, e.zip_url, e.extracted_text, r.version 
        FROM evaluation_logs e
        LEFT JOIN rubrics r ON e.rubric_id = r.id
        ORDER BY e.timestamp DESC
    """)
    rows = cursor.fetchall()
    conn.close()
    
    history_list = []
    for r in rows:
        try:
            results_json = json.loads(r[5])
            total_score = 0
            count = 0
            for item in results_json:
                score_val = item.get("score")
                if str(score_val).isdigit():
                    total_score += int(score_val)
                    count += 1
            avg_score = round(total_score / count, 2) if count > 0 else 0
        except:
            results_json = []
            avg_score = 0

        history_list.append({
            "id": r[0],
            "student_email": r[1],
            "filename": r[2],
            "project_type": r[3],
            "date": r[4],
            "results": results_json,
            "avg_score": avg_score,
            "zip_url": r[6],
            "extracted_text": r[7],
            "rubric_version": r[8] or 1
        })
        
    return history_list

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)