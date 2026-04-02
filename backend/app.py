from flask import Flask, request, send_file, jsonify
from PIL import Image
import io

from security_module import encrypt_message, decrypt_message, embed_data_into_image, extract_data_from_image

app = Flask(__name__)

@app.route('/encode', methods=['POST'])
def encode():
    try:
        if 'image' not in request.files:
            return jsonify({'error': 'No image provided'}), 400

        image_file = request.files['image']
        message = request.form.get('message')
        password = request.form.get('password')

        if not message or not password:
            return jsonify({'error': 'Missing message or password'}), 400

        image = Image.open(image_file).convert('RGB')

        encrypted_data = encrypt_message(message, password)
        encoded_image = embed_data_into_image(image, encrypted_data)

        img_io = io.BytesIO()
        encoded_image.save(img_io, format='PNG')
        img_io.seek(0)

        return send_file(img_io, mimetype='image/png', as_attachment=True, download_name='encoded.png')

    except Exception:
        return jsonify({'error': 'Encoding failed'}), 500


@app.route('/decode', methods=['POST'])
def decode():
    try:
        if 'image' not in request.files:
            return jsonify({'error': 'No image provided'}), 400

        image_file = request.files['image']
        password = request.form.get('password')

        if not password:
            return jsonify({'error': 'Password required'}), 400

        image = Image.open(image_file).convert('RGB')

        extracted_data = extract_data_from_image(image)
        if extracted_data is None:
            return jsonify({'error': 'No hidden data found'}), 400

        decrypted_message = decrypt_message(extracted_data, password)
        if decrypted_message is None:
            return jsonify({'error': 'Incorrect password or corrupted data'}), 400

        return jsonify({'message': decrypted_message})

    except Exception:
        return jsonify({'error': 'Decoding failed'}), 500


if __name__ == '__main__':
    app.run(debug=True)