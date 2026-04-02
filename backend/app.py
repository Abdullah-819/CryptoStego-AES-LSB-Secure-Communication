from flask import Flask, request, send_file, jsonify, send_from_directory
from PIL import Image
import io
import os

from security_module import encrypt_message, decrypt_message, embed_data_into_image, extract_data_from_image, visualize_lsb_changes

app = Flask(__name__, static_folder='../frontend', static_url_path='')

@app.route('/')
def home():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/<path:path>')
def static_files(path):
    return send_from_directory(app.static_folder, path)

@app.route('/encode', methods=['POST'])
def encode():
    try:
        if 'image' not in request.files:
            return jsonify({'error': 'Image file is required'}), 400

        image_file = request.files['image']
        message = request.form.get('message')
        password = request.form.get('password')

        if not message or not password:
            return jsonify({'error': 'Message and password are required'}), 400

        image = Image.open(image_file).convert('RGB')
        
        encrypted_data = encrypt_message(message, password)
        encoded_image = embed_data_into_image(image, encrypted_data)

        img_io = io.BytesIO()
        encoded_image.save(img_io, format='PNG')
        img_io.seek(0)

        return send_file(img_io, mimetype='image/png', as_attachment=True, download_name='stego_output.png')

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/decode', methods=['POST'])
def decode():
    try:
        if 'image' not in request.files:
            return jsonify({'error': 'Image file is required'}), 400

        image_file = request.files['image']
        password = request.form.get('password')

        if not password:
            return jsonify({'error': 'Password is required'}), 400

        image = Image.open(image_file).convert('RGB')
        
        extracted_data = extract_data_from_image(image)
        if extracted_data is None:
            return jsonify({'error': 'No hidden data detected in this image'}), 404

        decrypted_message = decrypt_message(extracted_data, password)
        if decrypted_message is None:
            return jsonify({'error': 'Decryption failed. Incorrect password or corrupted data.'}), 401

        return jsonify({'message': decrypted_message})

    except Exception as e:
        return jsonify({'error': 'An internal error occurred during decoding'}), 500

@app.route('/visualize', methods=['POST'])
def visualize():
    try:
        if 'original' not in request.files or 'encoded' not in request.files:
            return jsonify({'error': 'Both original and encoded images are required'}), 400

        original_file = request.files['original']
        encoded_file = request.files['encoded']

        original = Image.open(original_file).convert('RGB')
        encoded = Image.open(encoded_file).convert('RGB')

        if original.size != encoded.size:
            return jsonify({'error': 'Image dimensions must match for visualization'}), 400

        visual = visualize_lsb_changes(original, encoded)

        img_io = io.BytesIO()
        visual.save(img_io, format='PNG')
        img_io.seek(0)

        return send_file(img_io, mimetype='image/png')

    except Exception as e:
        return jsonify({'error': 'Visualization processing failed'}), 500

if __name__ == '__main__':
    app.run(debug=True, port=int(os.environ.get('PORT', 5000)))