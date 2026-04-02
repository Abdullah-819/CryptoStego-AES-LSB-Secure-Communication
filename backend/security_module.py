import base64
import math
from Crypto.Cipher import AES
from Crypto.Protocol.KDF import PBKDF2
from Crypto.Random import get_random_bytes
from Crypto.Util.Padding import pad, unpad

SALT_SIZE = 16
KEY_SIZE = 32
ITERATIONS = 100000
BLOCK_SIZE = AES.block_size
COMPLEXITY_THRESHOLD = 5

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

def get_pixel_complexity(pixels, width, height, x, y):
    if x == 0 or y == 0 or x == width - 1 or y == height - 1:
        return 0
    p = pixels[y * width + x]
    neighbors = [
        pixels[(y-1)*width + x], pixels[(y+1)*width + x],
        pixels[y*width + (x-1)], pixels[y*width + (x+1)]
    ]
    v = (p[0] >> 4) + (p[1] >> 4) + (p[2] >> 4)
    n_v = [(n[0] >> 4) + (n[1] >> 4) + (n[2] >> 4) for n in neighbors]
    return max(n_v) - min(n_v)

def embed_data_into_image(image, data):
    binary_data = to_binary(data) + '1111111111111110'
    width, height = image.size
    pixels = list(image.getdata())
    new_pixels = []
    data_index = 0
    total_bits = len(binary_data)

    for y in range(height):
        for x in range(width):
            idx = y * width + x
            r, g, b = pixels[idx]
            if data_index < total_bits:
                complexity = get_pixel_complexity(pixels, width, height, x, y)
                bits_to_hide = 2 if complexity > COMPLEXITY_THRESHOLD else 1
                
                for _ in range(bits_to_hide):
                    if data_index < total_bits:
                        r = (r & ~1) | int(binary_data[data_index])
                        data_index += 1
                
                if data_index < total_bits:
                    for _ in range(bits_to_hide):
                        if data_index < total_bits:
                            g = (g & ~1) | int(binary_data[data_index])
                            data_index += 1
                            
                if data_index < total_bits:
                    for _ in range(bits_to_hide):
                        if data_index < total_bits:
                            b = (b & ~1) | int(binary_data[data_index])
                            data_index += 1
                            
            new_pixels.append((r, g, b))

    image.putdata(new_pixels)
    return image

def extract_data_from_image(image):
    width, height = image.size
    pixels = list(image.getdata())
    binary_data = ""

    for y in range(height):
        for x in range(width):
            idx = y * width + x
            r, g, b = pixels[idx]
            complexity = get_pixel_complexity(pixels, width, height, x, y)
            bits_per_channel = 2 if complexity > COMPLEXITY_THRESHOLD else 1
            
            binary_data += str(r & 1)
            if bits_per_channel == 2:
                binary_data += str((r >> 1) & 1)
            
            binary_data += str(g & 1)
            if bits_per_channel == 2:
                binary_data += str((g >> 1) & 1)

            binary_data += str(b & 1)
            if bits_per_channel == 2:
                binary_data += str((b >> 1) & 1)

    end_marker = '1111111111111110'
    end_index = binary_data.find(end_marker)
    if end_index == -1:
        return None
    return from_binary(binary_data[:end_index])

def calculate_entropy(image):
    pixels = list(image.getdata())
    counts = [0] * 256
    for p in pixels:
        gray = int(0.299 * p[0] + 0.587 * p[1] + 0.114 * p[2])
        counts[gray] += 1
    total = len(pixels)
    entropy = 0
    for c in counts:
        if c > 0:
            p = c / total
            entropy -= p * math.log2(p)
    return entropy

def visualize_lsb_changes(original_image, encoded_image):
    original_pixels = list(original_image.getdata())
    encoded_pixels = list(encoded_image.getdata())
    new_pixels = []
    for orig, enc in zip(original_pixels, encoded_pixels):
        r1, g1, b1 = orig[:3]
        r2, g2, b2 = enc[:3]
        diff_r = (r1 & 1) != (r2 & 1) or ((r1 >> 1) & 1) != ((r2 >> 1) & 1)
        diff_g = (g1 & 1) != (g2 & 1) or ((g1 >> 1) & 1) != ((g2 >> 1) & 1)
        diff_b = (b1 & 1) != (b2 & 1) or ((b1 >> 1) & 1) != ((b2 >> 1) & 1)
        diff_count = int(diff_r) + int(diff_g) + int(diff_b)
        if diff_count > 0:
            intensity = 150 + (diff_count * 35)
            new_pixels.append((min(255, intensity), 0, 100))
        else:
            new_pixels.append((4, 4, 12))
    result = original_image.copy()
    result.putdata(new_pixels)
    return result