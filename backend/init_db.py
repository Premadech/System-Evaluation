# init_db.py
import sqlite3

def create_db():
    conn = sqlite3.connect('database.db')
    cursor = conn.cursor()
    
    # สร้างตาราง users สำหรับเก็บข้อมูลนักศึกษา
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL
    )
    ''')
    
    # สร้างตาราง logs สำหรับเก็บประวัติการประเมิน (ถ้าพี่ต้องใช้หน้า History)
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS evaluation_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_email TEXT NOT NULL,
        filename TEXT,
        results TEXT, -- เก็บเป็น JSON string
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )
    ''')
    
    conn.commit()
    conn.close()
    print("สร้าง Database ใหม่เรียบร้อยแล้วครับพี่!")

if __name__ == "__main__":
    create_db()