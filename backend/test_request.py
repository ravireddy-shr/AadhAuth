from contextlib import contextmanager
from unittest.mock import MagicMock

import app as app_module


@contextmanager
def patched_collections(fake_user):
    original_users = app_module.users_collection
    original_logs = app_module.logs_collection
    state = {'created': False}

    users = MagicMock()
    users.find_one.side_effect = lambda query: fake_user if state['created'] and query == {'aadhaar': fake_user['aadhaar']} else None
    users.insert_one.side_effect = lambda *_args, **_kwargs: state.update(created=True) or MagicMock(inserted_id='mock-user-id')

    logs = MagicMock()
    logs.insert_one.return_value = MagicMock()

    app_module.users_collection = users
    app_module.logs_collection = logs
    try:
        yield
    finally:
        app_module.users_collection = original_users
        app_module.logs_collection = original_logs


def run_smoke_test():
    test_aadhaar = '123456789012'
    fake_user = {
        '_id': 'mock-user-id',
        'aadhaar': test_aadhaar,
        'password': app_module.hash_password('testpass'),
        'role': 'passenger'
    }

    with patched_collections(fake_user):
        with app_module.app.test_client() as client:
            register_res = client.post('/register', json={
                'name': 'Test User',
                'aadhaar': test_aadhaar,
                'mobile': '1234567890',
                'password': 'testpass'
            })
            print('register:', register_res.status_code, register_res.get_json())

            login_res = client.post('/login', json={
                'aadhaar': test_aadhaar,
                'password': 'testpass'
            })
            print('login:', login_res.status_code, login_res.get_json())


if __name__ == '__main__':
    run_smoke_test()
