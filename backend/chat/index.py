import os
import json
from urllib.request import urlopen, Request
from urllib.error import URLError

def handler(event: dict, context) -> dict:
    """Обработчик чата — отправляет сообщения в Google Gemini и возвращает ответ"""

    if event.get('httpMethod') == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '86400',
            },
            'body': ''
        }

    body = json.loads(event.get('body') or '{}')
    messages = body.get('messages', [])

    if not messages:
        return {
            'statusCode': 400,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Нет сообщений'})
        }

    api_key = os.environ.get('GEMINI_API_KEY', '')

    # Конвертируем формат в Gemini
    gemini_contents = []
    for msg in messages:
        role = 'user' if msg['role'] == 'user' else 'model'
        gemini_contents.append({
            'role': role,
            'parts': [{'text': msg['content']}]
        })

    payload = json.dumps({
        'system_instruction': {
            'parts': [{'text': 'Ты полезный ИИ-помощник. Отвечай подробно и по существу на русском языке. Используй эмодзи там, где это уместно.'}]
        },
        'contents': gemini_contents,
        'generationConfig': {
            'maxOutputTokens': 1500,
            'temperature': 0.7,
        }
    }).encode('utf-8')

    url = f'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={api_key}'

    req = Request(url, data=payload, headers={'Content-Type': 'application/json'}, method='POST')

    try:
        with urlopen(req, timeout=25) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            reply = data['candidates'][0]['content']['parts'][0]['text']
            return {
                'statusCode': 200,
                'headers': {'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'reply': reply})
            }
    except URLError as e:
        error_body = ''
        if hasattr(e, 'read'):
            error_body = e.read().decode('utf-8')
        return {
            'statusCode': 502,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': f'Ошибка API: {str(e)}', 'detail': error_body})
        }