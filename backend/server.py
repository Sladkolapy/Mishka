from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Form
from fastapi.responses import FileResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import shutil
import json

# Document processing libraries
import openpyxl
from openpyxl import Workbook
from docx import Document
from pptx import Presentation
from pptx.util import Inches, Pt
import PyPDF2
import xlrd
import io

# AI Integration
from emergentintegrations.llm.chat import LlmChat, UserMessage

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'docai_chat')]

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'your-super-secret-jwt-key-change-in-production')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_HOURS = 24 * 7  # 7 days

# Emergent LLM Key
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')

# File storage
UPLOAD_DIR = ROOT_DIR / 'uploads'
UPLOAD_DIR.mkdir(exist_ok=True)
GENERATED_DIR = ROOT_DIR / 'generated'
GENERATED_DIR.mkdir(exist_ok=True)

# Create the main app
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Security
security = HTTPBearer()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ==================== MODELS ====================

class UserCreate(BaseModel):
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    created_at: datetime

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class ChatCreate(BaseModel):
    title: Optional[str] = None

class ChatResponse(BaseModel):
    id: str
    user_id: str
    title: str
    created_at: datetime
    updated_at: datetime

class MessageCreate(BaseModel):
    content: str

class MessageResponse(BaseModel):
    id: str
    chat_id: str
    role: str
    content: str
    file_id: Optional[str] = None
    file_name: Optional[str] = None
    created_at: datetime

class FileResponse_(BaseModel):
    id: str
    filename: str
    file_type: str
    is_generated: bool
    created_at: datetime

class ChatDetailResponse(BaseModel):
    id: str
    user_id: str
    title: str
    messages: List[MessageResponse]
    files: List[FileResponse_]
    created_at: datetime
    updated_at: datetime

# ==================== HELPERS ====================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str) -> str:
    payload = {
        'user_id': user_id,
        'exp': datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get('user_id')
        user = await db.users.find_one({'id': user_id})
        if not user:
            raise HTTPException(status_code=401, detail='User not found')
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail='Token expired')
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail='Invalid token')

# ==================== FILE PROCESSING ====================

def extract_excel_content(file_path: str) -> str:
    """Extract content from Excel files (.xlsx, .xls)"""
    try:
        if file_path.endswith('.xls'):
            workbook = xlrd.open_workbook(file_path)
            content = []
            for sheet in workbook.sheets():
                content.append(f"Sheet: {sheet.name}")
                for row_idx in range(sheet.nrows):
                    row = [str(sheet.cell_value(row_idx, col_idx)) for col_idx in range(sheet.ncols)]
                    content.append(" | ".join(row))
                content.append("")
            return "\n".join(content)
        else:
            workbook = openpyxl.load_workbook(file_path)
            content = []
            for sheet_name in workbook.sheetnames:
                sheet = workbook[sheet_name]
                content.append(f"Sheet: {sheet_name}")
                for row in sheet.iter_rows(values_only=True):
                    row_str = " | ".join([str(cell) if cell is not None else "" for cell in row])
                    content.append(row_str)
                content.append("")
            return "\n".join(content)
    except Exception as e:
        logger.error(f"Error extracting Excel content: {e}")
        return f"Error reading Excel file: {str(e)}"

def extract_word_content(file_path: str) -> str:
    """Extract content from Word files (.docx)"""
    try:
        doc = Document(file_path)
        content = []
        for para in doc.paragraphs:
            if para.text.strip():
                content.append(para.text)
        for table in doc.tables:
            content.append("\n[Table]")
            for row in table.rows:
                row_text = " | ".join([cell.text for cell in row.cells])
                content.append(row_text)
        return "\n".join(content)
    except Exception as e:
        logger.error(f"Error extracting Word content: {e}")
        return f"Error reading Word file: {str(e)}"

def extract_powerpoint_content(file_path: str) -> str:
    """Extract content from PowerPoint files (.pptx)"""
    try:
        prs = Presentation(file_path)
        content = []
        for idx, slide in enumerate(prs.slides, 1):
            content.append(f"\n--- Slide {idx} ---")
            for shape in slide.shapes:
                if hasattr(shape, "text") and shape.text.strip():
                    content.append(shape.text)
        return "\n".join(content)
    except Exception as e:
        logger.error(f"Error extracting PowerPoint content: {e}")
        return f"Error reading PowerPoint file: {str(e)}"

def extract_pdf_content(file_path: str) -> str:
    """Extract content from PDF files"""
    try:
        content = []
        with open(file_path, 'rb') as file:
            reader = PyPDF2.PdfReader(file)
            for page in reader.pages:
                text = page.extract_text()
                if text:
                    content.append(text)
        return "\n".join(content)
    except Exception as e:
        logger.error(f"Error extracting PDF content: {e}")
        return f"Error reading PDF file: {str(e)}"

def extract_txt_content(file_path: str) -> str:
    """Extract content from text files"""
    try:
        with open(file_path, 'r', encoding='utf-8') as file:
            return file.read()
    except UnicodeDecodeError:
        with open(file_path, 'r', encoding='latin-1') as file:
            return file.read()
    except Exception as e:
        logger.error(f"Error extracting TXT content: {e}")
        return f"Error reading text file: {str(e)}"

def extract_file_content(file_path: str, file_type: str) -> str:
    """Extract content based on file type"""
    extractors = {
        'xlsx': extract_excel_content,
        'xls': extract_excel_content,
        'docx': extract_word_content,
        'pptx': extract_powerpoint_content,
        'pdf': extract_pdf_content,
        'txt': extract_txt_content,
        'rtf': extract_txt_content,
    }
    extractor = extractors.get(file_type.lower())
    if extractor:
        return extractor(file_path)
    return "Unsupported file type"

def get_file_type(filename: str) -> str:
    """Get file type from filename"""
    ext = filename.lower().split('.')[-1]
    return ext

# ==================== EXCEL GENERATION ====================

def generate_excel_from_data(data: dict, filename: str) -> str:
    """Generate Excel file from structured data"""
    wb = Workbook()
    ws = wb.active
    
    if 'title' in data:
        ws.title = data['title'][:31]  # Excel sheet name limit
    
    if 'headers' in data:
        for col, header in enumerate(data['headers'], 1):
            ws.cell(row=1, column=col, value=header)
    
    if 'rows' in data:
        start_row = 2 if 'headers' in data else 1
        for row_idx, row_data in enumerate(data['rows'], start_row):
            for col_idx, cell_value in enumerate(row_data, 1):
                ws.cell(row=row_idx, column=col_idx, value=cell_value)
    
    file_path = GENERATED_DIR / filename
    wb.save(file_path)
    return str(file_path)

# ==================== AUTH ROUTES ====================

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user_data: UserCreate):
    # Check if user exists
    existing = await db.users.find_one({'email': user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail='Email already registered')
    
    # Create user
    user_id = str(uuid.uuid4())
    user = {
        'id': user_id,
        'email': user_data.email,
        'password_hash': hash_password(user_data.password),
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user)
    
    # Generate token
    token = create_token(user_id)
    
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user_id,
            email=user_data.email,
            created_at=datetime.fromisoformat(user['created_at'])
        )
    )

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(user_data: UserLogin):
    user = await db.users.find_one({'email': user_data.email})
    if not user or not verify_password(user_data.password, user['password_hash']):
        raise HTTPException(status_code=401, detail='Invalid email or password')
    
    token = create_token(user['id'])
    
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user['id'],
            email=user['email'],
            created_at=datetime.fromisoformat(user['created_at']) if isinstance(user['created_at'], str) else user['created_at']
        )
    )

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(user = Depends(get_current_user)):
    return UserResponse(
        id=user['id'],
        email=user['email'],
        created_at=datetime.fromisoformat(user['created_at']) if isinstance(user['created_at'], str) else user['created_at']
    )

# ==================== CHAT ROUTES ====================

@api_router.post("/chat/create", response_model=ChatResponse)
async def create_chat(chat_data: ChatCreate, user = Depends(get_current_user)):
    chat_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    chat = {
        'id': chat_id,
        'user_id': user['id'],
        'title': chat_data.title or 'New Chat',
        'created_at': now,
        'updated_at': now
    }
    await db.chats.insert_one(chat)
    
    return ChatResponse(
        id=chat_id,
        user_id=user['id'],
        title=chat['title'],
        created_at=datetime.fromisoformat(now),
        updated_at=datetime.fromisoformat(now)
    )

@api_router.get("/chat/list", response_model=List[ChatResponse])
async def list_chats(user = Depends(get_current_user)):
    chats = await db.chats.find(
        {'user_id': user['id']},
        {'_id': 0}
    ).sort('updated_at', -1).to_list(100)
    
    return [
        ChatResponse(
            id=c['id'],
            user_id=c['user_id'],
            title=c['title'],
            created_at=datetime.fromisoformat(c['created_at']) if isinstance(c['created_at'], str) else c['created_at'],
            updated_at=datetime.fromisoformat(c['updated_at']) if isinstance(c['updated_at'], str) else c['updated_at']
        )
        for c in chats
    ]

@api_router.get("/chat/{chat_id}", response_model=ChatDetailResponse)
async def get_chat(chat_id: str, user = Depends(get_current_user)):
    chat = await db.chats.find_one({'id': chat_id, 'user_id': user['id']})
    if not chat:
        raise HTTPException(status_code=404, detail='Chat not found')
    
    messages = await db.messages.find(
        {'chat_id': chat_id},
        {'_id': 0}
    ).sort('created_at', 1).to_list(1000)
    
    files = await db.files.find(
        {'chat_id': chat_id},
        {'_id': 0}
    ).sort('created_at', -1).to_list(100)
    
    return ChatDetailResponse(
        id=chat['id'],
        user_id=chat['user_id'],
        title=chat['title'],
        messages=[
            MessageResponse(
                id=m['id'],
                chat_id=m['chat_id'],
                role=m['role'],
                content=m['content'],
                file_id=m.get('file_id'),
                file_name=m.get('file_name'),
                created_at=datetime.fromisoformat(m['created_at']) if isinstance(m['created_at'], str) else m['created_at']
            )
            for m in messages
        ],
        files=[
            FileResponse_(
                id=f['id'],
                filename=f['filename'],
                file_type=f['file_type'],
                is_generated=f.get('is_generated', False),
                created_at=datetime.fromisoformat(f['created_at']) if isinstance(f['created_at'], str) else f['created_at']
            )
            for f in files
        ],
        created_at=datetime.fromisoformat(chat['created_at']) if isinstance(chat['created_at'], str) else chat['created_at'],
        updated_at=datetime.fromisoformat(chat['updated_at']) if isinstance(chat['updated_at'], str) else chat['updated_at']
    )

@api_router.delete("/chat/{chat_id}")
async def delete_chat(chat_id: str, user = Depends(get_current_user)):
    chat = await db.chats.find_one({'id': chat_id, 'user_id': user['id']})
    if not chat:
        raise HTTPException(status_code=404, detail='Chat not found')
    
    # Delete associated files
    files = await db.files.find({'chat_id': chat_id}).to_list(100)
    for f in files:
        try:
            if os.path.exists(f['file_path']):
                os.remove(f['file_path'])
        except:
            pass
    
    await db.files.delete_many({'chat_id': chat_id})
    await db.messages.delete_many({'chat_id': chat_id})
    await db.chats.delete_one({'id': chat_id})
    
    return {'status': 'deleted'}

# ==================== MESSAGE ROUTES ====================

@api_router.post("/chat/{chat_id}/upload")
async def upload_file(
    chat_id: str,
    file: UploadFile = File(...),
    user = Depends(get_current_user)
):
    # Verify chat exists and belongs to user
    chat = await db.chats.find_one({'id': chat_id, 'user_id': user['id']})
    if not chat:
        raise HTTPException(status_code=404, detail='Chat not found')
    
    # Validate file type
    file_type = get_file_type(file.filename)
    allowed_types = ['xlsx', 'xls', 'docx', 'pptx', 'pdf', 'txt', 'rtf']
    if file_type not in allowed_types:
        raise HTTPException(status_code=400, detail=f'File type not supported. Allowed: {allowed_types}')
    
    # Save file
    file_id = str(uuid.uuid4())
    file_path = UPLOAD_DIR / f"{file_id}_{file.filename}"
    
    with open(file_path, 'wb') as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Extract content
    extracted_content = extract_file_content(str(file_path), file_type)
    
    # Save file record
    now = datetime.now(timezone.utc).isoformat()
    file_record = {
        'id': file_id,
        'chat_id': chat_id,
        'user_id': user['id'],
        'filename': file.filename,
        'file_type': file_type,
        'file_path': str(file_path),
        'extracted_content': extracted_content[:50000],  # Limit content size
        'created_at': now,
        'is_generated': False
    }
    await db.files.insert_one(file_record)
    
    # Create message for file upload
    msg_id = str(uuid.uuid4())
    message = {
        'id': msg_id,
        'chat_id': chat_id,
        'role': 'user',
        'content': f'Uploaded file: {file.filename}',
        'file_id': file_id,
        'file_name': file.filename,
        'created_at': now
    }
    await db.messages.insert_one(message)
    
    # Update chat title if first file
    messages_count = await db.messages.count_documents({'chat_id': chat_id})
    if messages_count == 1:
        await db.chats.update_one(
            {'id': chat_id},
            {'$set': {'title': f'Chat: {file.filename}', 'updated_at': now}}
        )
    else:
        await db.chats.update_one(
            {'id': chat_id},
            {'$set': {'updated_at': now}}
        )
    
    return {
        'file_id': file_id,
        'filename': file.filename,
        'file_type': file_type,
        'message_id': msg_id,
        'extracted_preview': extracted_content[:500] + '...' if len(extracted_content) > 500 else extracted_content
    }

@api_router.post("/chat/{chat_id}/message", response_model=MessageResponse)
async def send_message(
    chat_id: str,
    message_data: MessageCreate,
    user = Depends(get_current_user)
):
    # Verify chat exists and belongs to user
    chat = await db.chats.find_one({'id': chat_id, 'user_id': user['id']})
    if not chat:
        raise HTTPException(status_code=404, detail='Chat not found')
    
    now = datetime.now(timezone.utc).isoformat()
    
    # Save user message
    user_msg_id = str(uuid.uuid4())
    user_message = {
        'id': user_msg_id,
        'chat_id': chat_id,
        'role': 'user',
        'content': message_data.content,
        'created_at': now
    }
    await db.messages.insert_one(user_message)
    
    # Get chat context (files and recent messages)
    files = await db.files.find({'chat_id': chat_id}, {'_id': 0}).to_list(10)
    messages = await db.messages.find(
        {'chat_id': chat_id},
        {'_id': 0}
    ).sort('created_at', -1).to_list(20)
    messages.reverse()  # Chronological order
    
    # Build context for AI
    file_context = ""
    for f in files:
        file_context += f"\n\n=== File: {f['filename']} ===\n{f.get('extracted_content', '')[:10000]}"
    
    system_message = """Ты - помощник для работы с документами. Ты помогаешь пользователям:
1. Анализировать загруженные файлы (Excel, Word, PowerPoint, PDF, TXT)
2. Создавать новые документы на основе шаблонов
3. Составлять графики работы для сотрудников
4. Отвечать на вопросы о содержимом файлов

Когда пользователь просит создать Excel таблицу, ты ДОЛЖЕН вернуть данные в формате JSON:
```json
{"action": "create_excel", "data": {"title": "Название листа", "headers": ["Колонка1", "Колонка2"], "rows": [["значение1", "значение2"], ["значение3", "значение4"]]}}
```

Контекст загруженных файлов:
""" + file_context
    
    # Send to AI
    try:
        chat_session = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"chat_{chat_id}_{uuid.uuid4()}",
            system_message=system_message
        ).with_model("openai", "gpt-5")
        
        # Build conversation history
        conversation = ""
        for msg in messages[-10:]:  # Last 10 messages
            role = "Пользователь" if msg['role'] == 'user' else "Ассистент"
            conversation += f"\n{role}: {msg['content']}"
        
        conversation += f"\nПользователь: {message_data.content}"
        
        ai_response = await chat_session.send_message(UserMessage(text=conversation))
        
    except Exception as e:
        logger.error(f"AI Error: {e}")
        ai_response = f"Извините, произошла ошибка при обработке запроса: {str(e)}"
    
    # Check if AI wants to create a file
    generated_file_id = None
    generated_file_name = None
    
    # Try to detect JSON in response - either in code block or raw
    json_str = None
    if '```json' in ai_response and '"action"' in ai_response:
        try:
            json_start = ai_response.find('```json') + 7
            json_end = ai_response.find('```', json_start)
            json_str = ai_response[json_start:json_end].strip()
        except:
            pass
    elif ai_response.strip().startswith('{') and '"action"' in ai_response:
        # Raw JSON response
        json_str = ai_response.strip()
    
    if json_str:
        try:
            action_data = json.loads(json_str)
            
            if action_data.get('action') == 'create_excel':
                excel_data = action_data.get('data', {})
                generated_file_id = str(uuid.uuid4())
                generated_filename = f"generated_{generated_file_id}.xlsx"
                file_path = generate_excel_from_data(excel_data, generated_filename)
                
                # Save file record
                file_record = {
                    'id': generated_file_id,
                    'chat_id': chat_id,
                    'user_id': user['id'],
                    'filename': excel_data.get('title', 'Generated') + '.xlsx',
                    'file_type': 'xlsx',
                    'file_path': file_path,
                    'extracted_content': '',
                    'created_at': now,
                    'is_generated': True
                }
                await db.files.insert_one(file_record)
                generated_file_name = file_record['filename']
                
                # Remove JSON from response
                ai_response = ai_response[:ai_response.find('```json')] + f"\n\nЯ создал файл '{generated_file_name}'. Вы можете скачать его ниже."
        except Exception as e:
            logger.error(f"Error creating Excel: {e}")
    
    # Save AI response
    ai_msg_id = str(uuid.uuid4())
    ai_message = {
        'id': ai_msg_id,
        'chat_id': chat_id,
        'role': 'assistant',
        'content': ai_response,
        'file_id': generated_file_id,
        'file_name': generated_file_name,
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    await db.messages.insert_one(ai_message)
    
    # Update chat timestamp
    await db.chats.update_one(
        {'id': chat_id},
        {'$set': {'updated_at': datetime.now(timezone.utc).isoformat()}}
    )
    
    return MessageResponse(
        id=ai_msg_id,
        chat_id=chat_id,
        role='assistant',
        content=ai_response,
        file_id=generated_file_id,
        file_name=generated_file_name,
        created_at=datetime.fromisoformat(ai_message['created_at'])
    )

# ==================== FILE DOWNLOAD ====================

@api_router.get("/files/{file_id}/download")
async def download_file(file_id: str, user = Depends(get_current_user)):
    file_record = await db.files.find_one({'id': file_id, 'user_id': user['id']})
    if not file_record:
        raise HTTPException(status_code=404, detail='File not found')
    
    if not os.path.exists(file_record['file_path']):
        raise HTTPException(status_code=404, detail='File not found on disk')
    
    return FileResponse(
        path=file_record['file_path'],
        filename=file_record['filename'],
        media_type='application/octet-stream'
    )

# ==================== HEALTH CHECK ====================

@api_router.get("/")
async def root():
    return {"message": "DocAI Chat API", "status": "running"}

@api_router.get("/health")
async def health():
    return {"status": "healthy"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
