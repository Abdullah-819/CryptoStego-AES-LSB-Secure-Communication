# 🔐 CryptoStego: AES + LSB Secure Communication System

CryptoStego is a dual-layer security web application that combines **AES encryption** and **LSB steganography** to securely hide and transmit messages داخل images.

---

## 🚀 Features

- 🔒 AES Encryption (CBC mode)
- 🖼️ LSB Image Steganography
- 🔑 Password-based key derivation
- ⚡ In-memory processing (No data storage)
- 🌐 REST API (Flask backend)
- 🎨 Glassmorphism UI (modern frontend)
- 📂 Drag & Drop image upload
- 📊 Encoding/Decoding progress bars
- ✨ Smooth animations & feedback system

---

## 🏗️ Project Structure
CryptoStego/
│
├── backend/
│ ├── app.py
│ ├── security_module.py
│ ├── stego_utils.py
│ ├── helpers.py
│ └── config.py
│
├── frontend/
│ ├── index.html
│ ├── styles.css
│ └── app.js
│
├── temp/
├── requirements.txt
└── README.md

---
## ⚙️ Installation
git clone https://github.com/Abdullah-819/CryptoStego-AES-LSB-Secure-Communication.git  
cd CryptoStego-AES-LSB-Secure-Communication  
pip install -r requirements.txt  

---

## ▶️ Run the Application
cd backend  
python app.py  
Then open:  
http://127.0.0.1:5000  

---

## 🔐 How It Works

### Encode Flow
- User inputs message + password + image  
- Message encrypted using AES  
- Encrypted data converted to binary  
- Data hidden in image using LSB  
- Encoded image available for download  

### Decode Flow
- User uploads encoded image + password  
- Binary data extracted from image  
- Data decrypted using AES  
- Original message displayed  

---

## 🛡️ Security Design
- AES-256 encryption  
- PBKDF2 key derivation  
- No database or file storage  
- In-memory processing only  
- Safe error handling  

---

## 📱 UI/UX Highlights
- Glassmorphism design  
- Animated loader & transitions  
- Responsive layout  
- Interactive feedback system  

---

## 📚 Educational Value

This project demonstrates:
- Applied Cryptography  
- Steganography Techniques  
- Secure System Design  
- Full-Stack Development  

---

## 👨‍💻 Author
Abdullah Rana  

---

## 📄 License
This project is for educational purposes.
