import os
import sqlite3
import json

def main():
    print("==================================================")
    print("   Eksportir Database Ituang Desktop ke JSON      ")
    print("==================================================")

    # Path default SQLite dari Electron AppData Roaming
    appdata = os.environ.get('APPDATA')
    if not appdata:
        print("Error: Tidak dapat mendeteksi folder AppData.")
        return

    db_path = os.path.join(appdata, 'ituang', 'ituang.db')
    if not os.path.exists(db_path):
        # Coba alternatif case-sensitive
        db_path = os.path.join(appdata, 'Ituang', 'ituang.db')

    if not os.path.exists(db_path):
        print(f"Database tidak ditemukan di path default:\n  {db_path}")
        user_path = input("Silakan masukkan path lokasi file 'ituang.db' Anda secara manual: ").strip()
        if os.path.exists(user_path):
            db_path = user_path
        else:
            print("File tidak ditemukan. Proses dibatalkan.")
            return

    print(f"Membuka database di: {db_path}")
    
    try:
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        # Eksport data dari tabel accounts
        accounts = []
        try:
            cursor.execute("SELECT * FROM accounts")
            for row in cursor.fetchall():
                accounts.append({
                    "id": row["id"],
                    "name": row["name"],
                    "category": row["category"],
                    "balance": row["balance"],
                    "created_at": row["created_at"]
                })
            print(f"[OK] Berhasil memuat {len(accounts)} data Rekening.")
        except Exception as e:
            print(f"- Info: Tabel 'accounts' gagal dimuat: {e}")

        # Eksport data dari tabel savings
        savings = []
        try:
            cursor.execute("SELECT * FROM savings")
            for row in cursor.fetchall():
                savings.append({
                    "id": row["id"],
                    "name": row["name"],
                    "balance": row["balance"],
                    "created_at": row["created_at"]
                })
            print(f"[OK] Berhasil memuat {len(savings)} data Tabungan.")
        except Exception as e:
            print(f"- Info: Tabel 'savings' gagal dimuat: {e}")

        # Eksport data dari tabel transactions
        transactions = []
        try:
            cursor.execute("SELECT * FROM transactions")
            for row in cursor.fetchall():
                transactions.append({
                    "id": row["id"],
                    "item_name": row["item_name"],
                    "amount": row["amount"],
                    "type": row["type"],
                    "category": row["category"],
                    "account_from_id": row["account_from_id"],
                    "account_to_id": row["account_to_id"],
                    "savings_from_id": row["savings_from_id"],
                    "savings_to_id": row["savings_to_id"],
                    "notes": row["notes"],
                    "created_at": row["created_at"]
                })
            print(f"[OK] Berhasil memuat {len(transactions)} data Transaksi.")
        except Exception as e:
            print(f"- Info: Tabel 'transactions' gagal dimuat: {e}")

        # Eksport data dari tabel budgets
        budgets = []
        try:
            cursor.execute("SELECT * FROM budgets")
            for row in cursor.fetchall():
                budgets.append({
                    "id": row["id"],
                    "category": row["category"],
                    "amount": row["amount"],
                    "is_default": row["is_default"],
                    "created_at": row["created_at"]
                })
            print(f"[OK] Berhasil memuat {len(budgets)} data Anggaran.")
        except Exception as e:
            print(f"- Info: Tabel 'budgets' gagal dimuat: {e}")

        # Eksport data dari tabel memos
        memos = []
        try:
            cursor.execute("SELECT * FROM memos")
            for row in cursor.fetchall():
                memos.append({
                    "id": row["id"],
                    "title": row["title"],
                    "content": row["content"],
                    "color": row.get("color", "#7aab8a"),
                    "date": row.get("date", "")
                })
            print(f"[OK] Berhasil memuat {len(memos)} data Catatan Keuangan.")
        except Exception as e:
            # Mengabaikan jika tidak ada tabel memo di db lama
            pass

        # Gabungkan dalam struktur dbState yang baru
        export_data = {
            "accounts": accounts,
            "savings": savings,
            "transactions": transactions,
            "budgets": budgets,
            "memos": memos
        }

        output_filename = "ituang_import.json"
        with open(output_filename, 'w', encoding='utf-8') as f:
            json.dump(export_data, f, ensure_ascii=False, indent=2)

        print("==================================================")
        print(f"BERHASIL! Data diekspor ke file: {output_filename}")
        print("Silakan buka aplikasi web Ituang, pergi ke menu")
        print("Pengaturan -> Import Data dari Desktop, lalu pilih")
        print("file 'ituang_import.json' tersebut untuk mengimpor.")
        print("==================================================")

        conn.close()

    except Exception as e:
        print(f"Terjadi kesalahan saat memproses database: {e}")

if __name__ == "__main__":
    main()
