"""
Generate a bcrypt password hash for the .env file.

Usage:
    python generate_password_hash.py your_password
"""

import sys
import bcrypt

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python generate_password_hash.py <password>")
        sys.exit(1)

    password = sys.argv[1].encode('utf-8')
    hashed = bcrypt.hashpw(password, bcrypt.gensalt())

    print("\nGenerated password hash:")
    print(hashed.decode('utf-8'))
    print("\nAdd this to your .env file as:")
    print(f'PASSWORD_HASH="{hashed.decode("utf-8")}"')
