# DocAI Chat - Приложение для работы с документами через ИИ

## Описание проекта
Веб-приложение в стиле чата для работы с документами (Excel, Word, PowerPoint, PDF, TXT).
Пользователь может загрузить шаблон (например, график работы в Excel) и через чат попросить ИИ создать новую таблицу на основе шаблона и своих пожеланий.

## Технологии
- **Backend**: FastAPI + Python
- **Frontend**: React + TailwindCSS + Shadcn UI
- **Database**: MongoDB
- **AI**: OpenAI GPT-5 (через Emergent Integrations)

## Функционал

### Авторизация
- Регистрация (email, пароль)
- Вход в систему
- JWT токены для сессий

### Чат с документами
- Загрузка файлов: XLSX, XLS, DOCX, PPTX, PDF, TXT
- Извлечение данных из документов на бэкенде
- Отправка данных в GPT-5 для анализа
- Чат-интерфейс для общения с ИИ о документах
- Создание новых документов по запросу

### Управление документами
- Скачивание сгенерированных файлов
- История чатов
- Список загруженных файлов

## API Endpoints

### Auth
- `POST /api/auth/register` - регистрация
- `POST /api/auth/login` - вход
- `GET /api/auth/me` - информация о пользователе

### Chat
- `POST /api/chat/create` - создать новый чат
- `GET /api/chat/list` - список чатов пользователя
- `GET /api/chat/{chat_id}` - получить чат с сообщениями
- `DELETE /api/chat/{chat_id}` - удалить чат

### Messages
- `POST /api/chat/{chat_id}/message` - отправить сообщение
- `POST /api/chat/{chat_id}/upload` - загрузить файл

### Files
- `GET /api/files/{file_id}/download` - скачать файл

## Database Schema (MongoDB)

### Users Collection
```json
{
  "id": "uuid",
  "email": "string",
  "password_hash": "string",
  "created_at": "datetime"
}
```

### Chats Collection
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "title": "string",
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

### Messages Collection
```json
{
  "id": "uuid",
  "chat_id": "uuid",
  "role": "user | assistant",
  "content": "string",
  "file_id": "uuid | null",
  "created_at": "datetime"
}
```

### Files Collection
```json
{
  "id": "uuid",
  "chat_id": "uuid",
  "user_id": "uuid",
  "filename": "string",
  "file_type": "xlsx | docx | pptx | pdf | txt",
  "file_path": "string",
  "extracted_content": "string",
  "created_at": "datetime",
  "is_generated": "boolean"
}
```

## Frontend Pages

1. **Login/Register Page** - авторизация
2. **Dashboard** - список чатов, создание нового чата
3. **Chat Page** - интерфейс чата с возможностью загрузки файлов

## Дизайн
- Тёмная тема в стиле современных мессенджеров
- Градиенты: фиолетово-синие оттенки
- Минималистичный интерфейс
- Drag & Drop для файлов
