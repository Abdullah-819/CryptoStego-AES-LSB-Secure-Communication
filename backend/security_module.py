import base64
from Crypto.Cipher import AES
from Crypto.Protocol.KDF import PBKDF2
from Crypto.Random import get_random_bytes
from Crypto.Util.Padding import pad, unpad

SALT_SIZE = 16
KEY_SIZE = 32
ITERATIONS = 100000
BLOCK_SIZE = AES.block_size

def derive_key(password, salt):
    return PBKDF2(password, salt, dkLen=KEY_SIZE, count=ITERATIONS)

def encrypt_message(message, password):
    salt = get_random_bytes(SALT_SIZE)
    key = derive_key(password.encode(), salt)
    cipher = AES.new(key, AES.MODE_CBC)
    ciphertext = cipher.encrypt(pad(message.encode(), BLOCK_SIZE))
    payload = salt + cipher.iv + ciphertext
    return base64.b64encode(payload)

def decrypt_message(encoded_data, password):
    try:
        data = base64.b64decode(encoded_data)
        salt = data[:SALT_SIZE]
        iv = data[SALT_SIZE:SALT_SIZE + BLOCK_SIZE]
        ciphertext = data[SALT_SIZE + BLOCK_SIZE:]
        key = derive_key(password.encode(), salt)
        cipher = AES.new(key, AES.MODE_CBC, iv)
        decrypted = unpad(cipher.decrypt(ciphertext), BLOCK_SIZE)
        return decrypted.decode()
    except Exception:
        return None

def to_binary(data):
    return ''.join(format(byte, '08b') for byte in data)

def from_binary(binary_data):
    byte_array = bytearray()
    for i in range(0, len(binary_data), 8):
        byte_array.append(int(binary_data[i:i+8], 2))
    return bytes(byte_array)

def embed_data_into_image(image, data):
    binary_data = to_binary(data) + '1111111111111110'
    pixels = list(image.getdata())
    new_pixels = []
    data_index = 0
    total_bits = len(binary_data)

    for pixel in pixels:
        r, g, b = pixel[:3]
        if data_index < total_bits:
            r = (r & ~1) | int(binary_data[data_index])
            data_index += 1
        if data_index < total_bits:
            g = (g & ~1) | int(binary_data[data_index])
            data_index += 1
        if data_index < total_bits:
            b = (b & ~1) | int(binary_data[data_index])
            data_index += 1
        new_pixels.append((r, g, b))

    image.putdata(new_pixels)
    return image

def extract_data_from_image(image):
    pixels = list(image.getdata())
    binary_data = ""

    for pixel in pixels:
        for color in pixel[:3]:
            binary_data += str(color & 1)

    end_marker = '1111111111111110'
    end_index = binary_data.find(end_marker)

    if end_index == -1:
        return None

    binary_data = binary_data[:end_index]
    return from_binary(binary_data)

def visualize_lsb_changes(original_image, encoded_image):
    original_pixels = list(original_image.getdata())
    encoded_pixels = list(encoded_image.getdata())

    new_pixels = []

    for orig, enc in zip(original_pixels, encoded_pixels):
        r1, g1, b1 = orig[:3]
        r2, g2, b2 = enc[:3]

        diff_r = (r1 & 1) != (r2 & 1)
        diff_g = (g1 & 1) != (g2 & 1)
        diff_b = (b1 & 1) != (b2 & 1)
        
        diff_count = int(diff_r) + int(diff_g) + int(diff_b)

        if diff_count > 0:
            intensity = 100 + (diff_count * 50)
            new_pixels.append((min(255, intensity), 0, 40))
        else:
            new_pixels.append((10, 10, 25))

    result = original_image.copy()
    result.putdata(new_pixels)
    return result