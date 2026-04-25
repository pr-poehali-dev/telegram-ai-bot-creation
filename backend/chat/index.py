import os
import json
from urllib.request import urlopen, Request
from urllib.error import URLError

def handler(event: dict, context) -> dict:
    """Обработчик чата — отправляет сообщения в OpenAI и возвращает ответ"""

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

    api_key = os.environ.get('OPENAI_API_KEY', '')

    payload = json.dumps({
        'model': 'gpt-4o-mini',
        'messages': [
            {'role': 'system', 'content': 'Ты полезный ИИ-помощник. Отвечай подробно и по существу на русском языке. Используй эмодзи для наглядности.'}
        ] + messages,
        'max_tokens': 1000,
        'temperature': 0.7,
    }).encode('utf-8')

    req = Request(
        'https://api.openai.com/v1/chat/completions',
        data=payload,
        headers={
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json',
        },
        method='POST'
    )

    try:
        with urlopen(req, timeout=25) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            reply = data['choices'][0]['message']['content']
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
