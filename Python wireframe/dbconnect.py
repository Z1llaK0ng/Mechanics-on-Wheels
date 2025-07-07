from sqlalchemy import create_engine

# Change the URL based on the database type
db_urls = {
    "sqlite": "sqlite:///example.db",
    "postgresql": "postgresql://user:password@localhost/mydatabase",
    "mysql": "mysql+mysqlconnector://user:password@localhost/mydatabase",
    "mssql": "mssql+pyodbc://user:password@localhost/mydatabase?driver=ODBC+Driver+17+for+SQL+Server"
}

# Pick the desired database
db_type = "sqlite"  # or "postgresql", "mysql", etc.
engine = create_engine(db_urls[db_type])

# Example query
with engine.connect() as conn:
    result = conn.execute("SELECT 1")
    print(result.fetchone())
