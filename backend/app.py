from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo import MongoClient
from PIL import Image
import io
import numpy as np
import bcrypt
import jwt
import datetime
import os
from bson import ObjectId
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

APP_ENV = os.getenv('APP_ENV', 'development').strip().lower()
IS_PRODUCTION = APP_ENV == 'production'
MONGO_URL = os.getenv('MONGO_URL', 'mongodb://localhost:27017/')
SECRET_KEY = os.getenv('SECRET_KEY')
if not SECRET_KEY:
    if IS_PRODUCTION:
        raise RuntimeError('SECRET_KEY environment variable is required when APP_ENV=production')
    SECRET_KEY = 'dev-local-secret-key'

CORS_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        'CORS_ORIGINS',
        '' if IS_PRODUCTION else 'http://localhost:3000,http://127.0.0.1:3000'
    ).split(',')
    if origin.strip()
]
CORS(app, resources={r"/*": {"origins": CORS_ORIGINS or []}})

client = MongoClient(MONGO_URL)
db = client['aadhaar_verification']
users_collection = db['users']
logs_collection = db['logs']
app.config['SECRET_KEY'] = SECRET_KEY


def get_bool_env(name, default=False):
    return os.getenv(name, str(default)).strip().lower() in {'1', 'true', 'yes', 'on'}


ENABLE_DEFAULT_ACCOUNTS = get_bool_env('ENABLE_DEFAULT_ACCOUNTS', not IS_PRODUCTION)
ENABLE_DEMO_SEEDING = get_bool_env('ENABLE_DEMO_SEEDING', not IS_PRODUCTION)

DEFAULT_CONDUCTOR_AADHAAR = os.getenv('DEFAULT_CONDUCTOR_AADHAAR') or (None if IS_PRODUCTION else '999999999999')
DEFAULT_CONDUCTOR_PASSWORD = os.getenv('DEFAULT_CONDUCTOR_PASSWORD') or (None if IS_PRODUCTION else 'cond1234')
DEFAULT_GOVERNMENT_AADHAAR = os.getenv('DEFAULT_GOVERNMENT_AADHAAR') or (None if IS_PRODUCTION else '888888888888')
DEFAULT_GOVERNMENT_PASSWORD = os.getenv('DEFAULT_GOVERNMENT_PASSWORD') or (None if IS_PRODUCTION else 'gov1234')


def hash_password(password):
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())


def check_password(password, hashed):
    return bcrypt.checkpw(password.encode('utf-8'), hashed)


def ensure_default_account(name, aadhaar, mobile, password, role):
    if not aadhaar or not password:
        return False

    existing_user = users_collection.find_one({'aadhaar': aadhaar})
    if existing_user:
        return False

    users_collection.insert_one({
        'name': name,
        'aadhaar': aadhaar,
        'mobile': mobile,
        'password': hash_password(password),
        'role': role,
        'face_encoding': None,
        'eligible': False,
        'gov_approval': False,
        'created_at': datetime.datetime.utcnow()
    })
    return True


def ensure_default_accounts():
    if not ENABLE_DEFAULT_ACCOUNTS:
        return

    ensure_default_account(
        'Default Conductor',
        DEFAULT_CONDUCTOR_AADHAAR,
        '9000000000',
        DEFAULT_CONDUCTOR_PASSWORD,
        'conductor'
    )
    ensure_default_account(
        'Default Government',
        DEFAULT_GOVERNMENT_AADHAAR,
        '9000000001',
        DEFAULT_GOVERNMENT_PASSWORD,
        'government'
    )


def generate_token(user_id):
    payload = {
        'user_id': user_id,
        'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
    }
    return jwt.encode(payload, SECRET_KEY, algorithm='HS256')


def verify_token(token):
    try:
        if token.startswith('Bearer '):
            token = token.replace('Bearer ', '')
        return jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
    except Exception:
        return None


def get_json_body():
    return request.get_json(silent=True) or {}


def get_current_user():
    auth = request.headers.get('Authorization', '')
    payload = verify_token(auth)
    if not payload:
        return None, (jsonify({'error': 'Invalid or missing token'}), 401)

    try:
        user = users_collection.find_one({'_id': ObjectId(payload['user_id'])})
    except Exception:
        return None, (jsonify({'error': 'Invalid token payload'}), 401)

    if not user:
        return None, (jsonify({'error': 'User not found'}), 404)

    return user, None


def require_roles(*allowed_roles):
    user, error = get_current_user()
    if error:
        return None, error

    if allowed_roles and user.get('role') not in allowed_roles:
        return None, (jsonify({'error': 'Insufficient permissions'}), 403)

    return user, None


def image_hash(image):
    # image is an RGB PIL Image
    gray = image.convert('L')
    small = gray.resize((8, 8), Image.Resampling.BILINEAR)
    arr = np.array(small, dtype=np.float32)
    avg = arr.mean()
    bits = (arr > avg).astype(np.uint8).flatten()
    return ''.join(str(int(b)) for b in bits)


ensure_default_accounts()


@app.route('/register', methods=['POST'])
def register():
    data = get_json_body()
    name = data.get('name', '').strip()
    aadhaar = data.get('aadhaar', '').strip()
    mobile = data.get('mobile', '').strip()
    password = data.get('password', '').strip()

    if not name or not aadhaar or not mobile or not password:
        return jsonify({'error': 'All fields are required'}), 400

    if len(aadhaar) != 12 or not aadhaar.isdigit():
        return jsonify({'error': 'Invalid Aadhaar number'}), 400

    if users_collection.find_one({'aadhaar': aadhaar}):
        return jsonify({'error': 'Aadhaar already registered'}), 400

    hashed = hash_password(password)

    user = {
        'name': name,
        'aadhaar': aadhaar,
        'mobile': mobile,
        'password': hashed,
        'role': 'passenger',
        'face_encoding': None,
        'eligible': False,
        'gov_approval': False,
        'created_at': datetime.datetime.utcnow()
    }

    users_collection.insert_one(user)
    logs_collection.insert_one({'action': 'register', 'aadhaar': aadhaar, 'timestamp': datetime.datetime.utcnow()})

    return jsonify({'message': 'Registered successfully'}), 201


@app.route('/login', methods=['POST'])
def login():
    data = get_json_body()
    aadhaar = data.get('aadhaar', '').strip()
    password = data.get('password', '').strip()

    user = users_collection.find_one({'aadhaar': aadhaar})
    if not user or not check_password(password, user['password']):
        return jsonify({'error': 'Invalid credentials'}), 401

    token = generate_token(str(user['_id']))
    return jsonify({'token': token, 'role': user.get('role', 'passenger')}), 200


@app.route('/verify_aadhaar', methods=['POST'])
def verify_aadhaar():
    data = get_json_body()
    aadhaar = data.get('aadhaar', '').strip()
    if len(aadhaar) == 12 and aadhaar.isdigit():
        details = {
            'name': 'Mock User',
            'dob': '1990-01-01',
            'address': 'Mock Address, India',
            'status': 'VERIFIED'
        }
        return jsonify({'verified': True, 'details': details}), 200
    return jsonify({'verified': False, 'error': 'Invalid Aadhaar format'}), 400


def find_best_face_match(face_hash_value, tolerance=12):
    all_users = list(users_collection.find({'face_encoding': {'$ne': None}}))
    best = None
    best_distance = None
    for u in all_users:
        stored = u.get('face_encoding')
        if not stored or len(stored) != len(face_hash_value):
            continue
        distance = sum(c1 != c2 for c1, c2 in zip(stored, face_hash_value))
        if best is None or distance < best_distance:
            best = u
            best_distance = distance
    if best is None or best_distance > tolerance:
        return None, None
    return best, best_distance


@app.route('/seed_gov_data', methods=['POST'])
def seed_gov_data():
    current_user, error = require_roles('government', 'admin')
    if error:
        return error

    if not ENABLE_DEMO_SEEDING:
        return jsonify({'error': 'Demo seeding is disabled'}), 403

    # Generates demo government records for testing.
    sample = []
    existing_aadhaars = set(
        user['aadhaar']
        for user in users_collection.find(
            {
                'aadhaar': {
                    '$in': [str(100000000000 + i) for i in range(1, 11)] + [
                        value for value in (
                            DEFAULT_CONDUCTOR_AADHAAR,
                            DEFAULT_GOVERNMENT_AADHAAR
                        ) if value
                    ]
                }
            },
            {'aadhaar': 1}
        )
    )

    # seed demo passengers
    for i in range(1, 11):
        aadhar = str(100000000000 + i)
        if aadhar in existing_aadhaars:
            continue
        sample.append({
            'name': f'Demo Citizen {i}',
            'aadhaar': aadhar,
            'mobile': f'900000000{i}',
            'password': hash_password('demo1234'),
            'role': 'passenger',
            'face_encoding': None,
            'eligible': False,
            'gov_approval': False,
            'created_at': datetime.datetime.utcnow()
        })

    # also create conductor and government authorized accounts
    if DEFAULT_CONDUCTOR_AADHAAR and DEFAULT_CONDUCTOR_AADHAAR not in existing_aadhaars and DEFAULT_CONDUCTOR_PASSWORD:
        sample.append({
            'name': 'Default Conductor',
            'aadhaar': DEFAULT_CONDUCTOR_AADHAAR,
            'mobile': '9000000000',
            'password': hash_password(DEFAULT_CONDUCTOR_PASSWORD),
            'role': 'conductor',
            'face_encoding': None,
            'eligible': False,
            'gov_approval': False,
            'created_at': datetime.datetime.utcnow()
        })
    if DEFAULT_GOVERNMENT_AADHAAR and DEFAULT_GOVERNMENT_AADHAAR not in existing_aadhaars and DEFAULT_GOVERNMENT_PASSWORD:
        sample.append({
            'name': 'Default Government',
            'aadhaar': DEFAULT_GOVERNMENT_AADHAAR,
            'mobile': '9000000001',
            'password': hash_password(DEFAULT_GOVERNMENT_PASSWORD),
            'role': 'government',
            'face_encoding': None,
            'eligible': False,
            'gov_approval': False,
            'created_at': datetime.datetime.utcnow()
        })

    if sample:
        users_collection.insert_many(sample)
        logs_collection.insert_one({
            'action': 'seed_gov_data',
            'user_id': str(current_user['_id']),
            'added_records': len(sample),
            'timestamp': datetime.datetime.utcnow()
        })

    return jsonify({'message': f'Seed completed. Added {len(sample)} records.'}), 201


@app.route('/rtc/scan', methods=['POST'])
def rtc_scan():
    examiner, error = require_roles('conductor', 'admin')
    if error:
        return error

    face_user = None
    distance = None

    if 'face' in request.files:
        face_file = request.files['face']
        image_bytes = face_file.read()
        try:
            image = Image.open(io.BytesIO(image_bytes)).convert('RGB')
        except Exception:
            return jsonify({'error': 'Cannot decode image'}), 400
        face_hash_value = image_hash(image)
        matched_user, distance = find_best_face_match(face_hash_value)
        if not matched_user:
            return jsonify({'scan': False, 'message': 'No matching face found in government database'}), 404
        face_user = matched_user

    elif request.json and request.json.get('aadhaar'):
        face_user = users_collection.find_one({'aadhaar': request.json.get('aadhaar')})
        if not face_user:
            return jsonify({'scan': False, 'message': 'No such user Aadhaar in database'}), 404

    if not face_user:
        return jsonify({'error': 'Provide face image or Aadhaar to scan'}), 400

    # Mock government iris check: pass if user has face encoding or old pass item
    gov_pass = bool(face_user.get('face_encoding'))
    if not gov_pass:
        # maybe if existing seed data, pass random 20% as preapproved for demo
        gov_pass = (int(face_user.get('aadhaar')[-1]) % 5 != 0)

    eligible = gov_pass and face_user.get('eligible', False)

    users_collection.update_one(
        {'_id': face_user['_id']},
        {'$set': {
            'gov_approval': gov_pass,
            'eligible': eligible,
            'last_gov_scan': datetime.datetime.utcnow()
        }}
    )

    logs_collection.insert_one({
        'action': 'rtc_scan',
        'conductor_id': str(examiner['_id']),
        'target_user_id': str(face_user['_id']),
        'distance': distance,
        'gov_pass': gov_pass,
        'eligible': eligible,
        'timestamp': datetime.datetime.utcnow()
    })

    return jsonify({
        'scan': True,
        'matched_user': {
            'name': face_user['name'],
            'aadhaar': face_user['aadhaar'],
            'eligible': eligible,
            'gov_pass': gov_pass,
            'distance': distance
        }
    }), 200


@app.route('/gov/stats', methods=['GET'])
def gov_stats():
    auth = request.headers.get('Authorization', '')
    payload = verify_token(auth)
    if not payload:
        return jsonify({'error': 'Invalid or missing token'}), 401

    user = users_collection.find_one({'_id': ObjectId(payload['user_id'])})
    if not user or user.get('role') != 'government':
        return jsonify({'error': 'Only government role can fetch stats'}), 403

    total_scans = logs_collection.count_documents({'action': 'rtc_scan'})
    approved = logs_collection.count_documents({'action': 'rtc_scan', 'gov_pass': True})
    rejected = logs_collection.count_documents({'action': 'rtc_scan', 'gov_pass': False})
    total_passengers = users_collection.count_documents({'role': 'passenger'})
    eligible = users_collection.count_documents({'eligible': True})

    return jsonify({
        'total_scans': total_scans,
        'approved': approved,
        'rejected': rejected,
        'total_passengers': total_passengers,
        'eligible': eligible
    }), 200


@app.route('/users/gov', methods=['GET'])
def users_gov():
    current_user, error = require_roles('conductor', 'government', 'admin')
    if error:
        return error

    users = []
    filter_role = request.args.get('role')
    query = {}
    if filter_role:
        query['role'] = filter_role
    if current_user.get('role') == 'conductor':
        query['role'] = 'passenger'

    for user in users_collection.find(query, {'password': 0, 'face_encoding': 0}):
        user['_id'] = str(user['_id'])
        users.append(user)
    return jsonify(users), 200


@app.route('/upload_face', methods=['POST'])
def upload_face():
    user, error = get_current_user()
    if error:
        return error

    user_id = str(user['_id'])

    if 'face' not in request.files:
        return jsonify({'error': 'Missing face file'}), 400

    face_file = request.files['face']
    image_bytes = face_file.read()
    try:
        image = Image.open(io.BytesIO(image_bytes)).convert('RGB')
    except Exception:
        return jsonify({'error': 'Cannot decode image'}), 400

    # simple image hash to simulate face encoding without heavy libs
    face_hash_value = image_hash(image)
    users_collection.update_one({'_id': user['_id']}, {'$set': {'face_encoding': face_hash_value}})
    logs_collection.insert_one({'action': 'upload_face', 'user_id': user_id, 'timestamp': datetime.datetime.utcnow()})

    return jsonify({'message': 'Face uploaded successfully'}), 200


@app.route('/authenticate_face', methods=['POST'])
def authenticate_face():
    user, error = get_current_user()
    if error:
        return error

    user_id = str(user['_id'])
    if not user.get('face_encoding'):
        return jsonify({'error': 'No stored face found'}), 400

    if 'face' not in request.files:
        return jsonify({'error': 'Missing face file'}), 400

    face_file = request.files['face']
    image_bytes = face_file.read()
    try:
        image = Image.open(io.BytesIO(image_bytes)).convert('RGB')
    except Exception:
        return jsonify({'error': 'Cannot decode image'}), 400

    captured_hash = image_hash(image)
    stored_hash = user['face_encoding']

    # Hamming distance for simple decision
    distance = sum(ch1 != ch2 for ch1, ch2 in zip(stored_hash, captured_hash))
    match = distance <= 10
    percentage = max(0.0, min(100.0, 100.0 - (distance / 64.0 * 100.0)))

    logs_collection.insert_one({'action': 'authenticate_face', 'user_id': user_id, 'match': match, 'percentage': percentage, 'distance': distance, 'timestamp': datetime.datetime.utcnow()})

    return jsonify({'match': match, 'percentage': percentage}), 200


@app.route('/check_eligibility', methods=['GET'])
def check_eligibility():
    user, error = get_current_user()
    if error:
        return error

    eligible = bool(user.get('face_encoding'))
    users_collection.update_one({'_id': user['_id']}, {'$set': {'eligible': eligible}})

    return jsonify({'eligible': eligible}), 200


@app.route('/admin/users', methods=['GET'])
def admin_users():
    _, error = require_roles('admin')
    if error:
        return error

    users = []
    for user in users_collection.find({}, {'password': 0, 'face_encoding': 0}):
        user['_id'] = str(user['_id'])
        users.append(user)
    return jsonify(users), 200


@app.route('/admin/logs', methods=['GET'])
def admin_logs():
    _, error = require_roles('admin')
    if error:
        return error

    logs = []
    for log in logs_collection.find().sort('timestamp', -1):
        log['_id'] = str(log['_id'])
        log['timestamp'] = log['timestamp'].isoformat()
        logs.append(log)
    return jsonify(logs), 200


if __name__ == '__main__':
    debug_mode = get_bool_env('FLASK_DEBUG', not IS_PRODUCTION)
    app.run(
        host='0.0.0.0',
        port=int(os.getenv('PORT', '5000')),
        debug=debug_mode,
        use_reloader=get_bool_env('FLASK_RELOAD', False)
    )
