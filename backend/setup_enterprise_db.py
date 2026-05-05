import sqlite3
import random
from datetime import datetime, timedelta

def setup_database():
    print("Booting up the Corporate Sandbox...")
    
    # OPTIMIZATION 1: Context manager handles commit and close safely!
    with sqlite3.connect('enterprise_data.db') as conn:
        cursor = conn.cursor()

        # 1. Create the Products Table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS products (
                product_id INTEGER PRIMARY KEY,
                product_name TEXT,
                category TEXT,
                price REAL
            )
        ''')

        # 2. Create the Regions Table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS regions (
                region_id INTEGER PRIMARY KEY,
                region_name TEXT,
                regional_manager TEXT
            )
        ''')

        # 3. Create the Sales Table (The core data!)
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS sales (
                sale_id INTEGER PRIMARY KEY AUTOINCREMENT,
                sale_date DATE,
                product_id INTEGER,
                region_id INTEGER,
                quantity INTEGER,
                revenue REAL,
                FOREIGN KEY (product_id) REFERENCES products (product_id),
                FOREIGN KEY (region_id) REFERENCES regions (region_id)
            )
        ''')

        # --- POPULATE DUMMY DATA ---
        print("Injecting enterprise data...")
        
        # Insert Products
        products = [
            (1, 'AI-VA Pro License', 'Software', 1200.00),
            (2, 'Cloud Storage 1TB', 'Subscription', 150.00),
            (3, 'Enterprise Support Plan', 'Service', 500.00),
            (4, 'Data Analytics Dashboard', 'Software', 850.00)
        ]
        cursor.executemany('INSERT OR IGNORE INTO products VALUES (?, ?, ?, ?)', products)

        # Insert Regions
        regions = [
            (1, 'North America', 'Sarah Connor'),
            (2, 'Europe', 'James Bond'),
            (3, 'Asia Pacific', 'Bruce Wayne')
        ]
        cursor.executemany('INSERT OR IGNORE INTO regions VALUES (?, ?, ?)', regions)

        # OPTIMIZATION 2: Dictionary lookup for O(1) speed instead of searching the list
        price_map = {p[0]: p[3] for p in products}

        # Generate 100 random sales over the last 90 days
        sales_data = []
        base_date = datetime.now() - timedelta(days=90)
        
        for _ in range(100):
            # Randomize the sale details
            days_offset = random.randint(0, 90)
            sale_date = (base_date + timedelta(days=days_offset)).strftime('%Y-%m-%d')
            product_id = random.randint(1, 4)
            region_id = random.randint(1, 3)
            quantity = random.randint(1, 5)
            
            # Calculate revenue using the blazing fast dictionary lookup
            price = price_map[product_id]
            revenue = quantity * price
            
            sales_data.append((sale_date, product_id, region_id, quantity, revenue))

        cursor.executemany('''
            INSERT INTO sales (sale_date, product_id, region_id, quantity, revenue)
            VALUES (?, ?, ?, ?, ?)
        ''', sales_data)

    print("✅ Success! 'enterprise_data.db' has been created and populated.")

if __name__ == "__main__":
    setup_database()