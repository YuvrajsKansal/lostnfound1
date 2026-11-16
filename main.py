from contextlib import asynccontextmanager
from datetime import date, datetime, timezone
import hashlib
from pathlib import Path
import secrets
from typing import Annotated, List, Optional
import uuid

from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, Query, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field as PydanticField
from sqlmodel import Field, Session, SQLModel, create_engine, or_, select

# ---------------------------------------------------------------------------
# Database Configuration
# ---------------------------------------------------------------------------
DATABASE_URL = "sqlite:///lost.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})

# ---------------------------------------------------------------------------
# Categories (mirrors C++ string categories[6])
# ---------------------------------------------------------------------------
CATEGORIES = ["Wallet", "Phone", "ID Card", "Bag", "Keys", "Other"]

# ---------------------------------------------------------------------------
# Database Models
# ---------------------------------------------------------------------------
class User(SQLModel, table=True):
    """
    Mirrors C++ User class:
    - userId, username, password, contact
    """
    id: Optional[int] = Field(default=None, primary_key=True)
    username: str = Field(unique=True, index=True)
    password_hash: str
    contact: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class AuthToken(SQLModel, table=True):
    """Session token for authenticated users."""
    token: str = Field(primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ItemRecord(SQLModel, table=True):
    """
    Unified item model that combines C++ Item, LostItem, and FoundItem:
    - Base Item: id, name, date, reporterID, description, category, location, isResolved
    - LostItem: ownerContact, identifyingMark
    - FoundItem: finderContact, whereKept
    - Plus image_path from original main.py
    """
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True)
    item_type: str = Field(index=True)  # "lost" or "found"
    item_date: date = Field(default_factory=date.today)
    reporter_id: int = Field(foreign_key="user.id", index=True)
    description: str
    category: str = Field(default="Other", index=True)
    location: str
    is_resolved: bool = Field(default=False, index=True)
    image_path: Optional[str] = None

    # Lost-specific fields
    owner_contact: Optional[str] = None
    identifying_mark: Optional[str] = None

    # Found-specific fields
    finder_contact: Optional[str] = None
    where_kept: Optional[str] = None

    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    def matches(self, keyword: str) -> bool:
        """Mirrors C++ Item::matches(string keyword)"""
        all_text = f"{self.name} {self.description} {self.category} {self.location}".lower()
        return keyword.lower() in all_text

    def mark_resolved(self) -> None:
        """Mirrors C++ Item::markResolved()"""
        self.is_resolved = True


# Legacy table kept for backward compatibility with original main.py
class Lost_db(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str = Field(default=None)
    found_date: date = Field(default=None)
    description: str = Field(default=None)
    image_path: Optional[str] = None


# ---------------------------------------------------------------------------
# Password & Auth Helpers
# ---------------------------------------------------------------------------
def hash_password(password: str) -> str:
    salt = secrets.token_hex(8)
    h = hashlib.sha256((salt + password).encode("utf-8")).hexdigest()
    return f"{salt}${h}"


def verify_password(password: str, hashed: str) -> bool:
    try:
        salt, h = hashed.split("$", 1)
        return hashlib.sha256((salt + password).encode("utf-8")).hexdigest() == h
    except Exception:
        return False


# ---------------------------------------------------------------------------
# FastAPI App Lifecycle & Static Files
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    SQLModel.metadata.create_all(engine)
    yield


app = FastAPI(
    title="Smart Lost & Found System",
    description="Backend API integrated with User Auth, Lost/Found categorization, Search, and Image Uploads.",
    version="2.0.0",
    lifespan=lifespan,
)

# CORS Middleware (allows frontend integration)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

ALLOWED_TYPES = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}
MAX_SIZE = 5 * 1024 * 1024


# ---------------------------------------------------------------------------
# Dependency: Database Session
# ---------------------------------------------------------------------------
def get_session():
    with Session(engine) as session:
        yield session


SessionDep = Annotated[Session, Depends(get_session)]

# ---------------------------------------------------------------------------
# Dependency: Authentication (Bearer Token or X-User-Id fallback)
# ---------------------------------------------------------------------------
security = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    x_user_id: Optional[int] = Header(None, alias="X-User-Id"),
    session: Session = Depends(get_session),
) -> User:
    """Retrieves authenticated user from token or X-User-Id header."""
    if credentials:
        auth_record = session.get(AuthToken, credentials.credentials)
        if auth_record:
            user = session.get(User, auth_record.user_id)
            if user:
                return user

    if x_user_id is not None:
        user = session.get(User, x_user_id)
        if user:
            return user

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Authentication required. Please log in first.",
    )


def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    x_user_id: Optional[int] = Header(None, alias="X-User-Id"),
    session: Session = Depends(get_session),
) -> Optional[User]:
    if credentials:
        auth_record = session.get(AuthToken, credentials.credentials)
        if auth_record:
            user = session.get(User, auth_record.user_id)
            if user:
                return user
    if x_user_id is not None:
        return session.get(User, x_user_id)
    return None


# ---------------------------------------------------------------------------
# Pydantic Schemas
# ---------------------------------------------------------------------------
class UserSignUp(BaseModel):
    username: str
    password: str
    contact: str


class UserLogin(BaseModel):
    username: str
    password: str


class UserResponse(BaseModel):
    id: int
    username: str
    contact: str


class TokenResponse(BaseModel):
    token: str
    user: UserResponse


class LegacyItemUpdate(BaseModel):
    title: str = PydanticField(default=None)
    found_date: date = PydanticField(default=None)
    description: str = PydanticField(default=None)


class ItemUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    location: Optional[str] = None
    item_date: Optional[date] = None
    owner_contact: Optional[str] = None
    identifying_mark: Optional[str] = None
    finder_contact: Optional[str] = None
    where_kept: Optional[str] = None


# ---------------------------------------------------------------------------
# Helper: Save Uploaded Image
# ---------------------------------------------------------------------------
async def save_image_upload(image: Optional[UploadFile]) -> Optional[str]:
    if not image or not image.filename:
        return None

    ext = ALLOWED_TYPES.get(image.content_type)
    if not ext:
        raise HTTPException(status_code=400, detail="Only JPEG, PNG or WEBP images allowed")

    data = await image.read()
    if len(data) > MAX_SIZE:
        raise HTTPException(status_code=413, detail="Image too large (max 5 MB)")

    filename = f"{uuid.uuid4().hex}{ext}"
    (UPLOAD_DIR / filename).write_bytes(data)
    return f"/uploads/{filename}"


# ===========================================================================
# 1. AUTHENTICATION ENDPOINTS (mirrors C++ signUp, login, logout)
# ===========================================================================
@app.post("/auth/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def sign_up(user_in: UserSignUp, session: SessionDep):
    """Mirrors C++ signUp(): Register a new user."""
    existing_user = session.exec(select(User).where(User.username == user_in.username)).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="That username is already taken.",
        )

    new_user = User(
        username=user_in.username,
        password_hash=hash_password(user_in.password),
        contact=user_in.contact,
    )
    session.add(new_user)
    session.commit()
    session.refresh(new_user)
    return UserResponse(id=new_user.id, username=new_user.username, contact=new_user.contact)


@app.post("/auth/login", response_model=TokenResponse)
def login(creds: UserLogin, session: SessionDep):
    """Mirrors C++ login(): Authenticate user and issue token."""
    user = session.exec(select(User).where(User.username == creds.username)).first()
    if not user or not verify_password(creds.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Wrong username or password.",
        )

    token_val = secrets.token_hex(24)
    auth_record = AuthToken(token=token_val, user_id=user.id)
    session.add(auth_record)
    session.commit()

    return TokenResponse(
        token=token_val,
        user=UserResponse(id=user.id, username=user.username, contact=user.contact),
    )


@app.post("/auth/logout")
def logout(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    session: SessionDep = None,
):
    """Mirrors C++ logout(): Invalidate current session."""
    if credentials:
        auth_record = session.get(AuthToken, credentials.credentials)
        if auth_record:
            session.delete(auth_record)
            session.commit()
    return {"message": "Logged out successfully."}


@app.get("/auth/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """Get current logged-in user profile."""
    return UserResponse(id=current_user.id, username=current_user.username, contact=current_user.contact)


# ===========================================================================
# 2. CATEGORIES ENDPOINT (mirrors C++ string categories[6])
# ===========================================================================
@app.get("/categories")
def get_categories():
    """Return available categories."""
    return {"categories": CATEGORIES}


# ===========================================================================
# 3. REPORT ITEMS (mirrors C++ addLostItem, addFoundItem)
# ===========================================================================
@app.post("/items/lost", status_code=status.HTTP_201_CREATED)
async def add_lost_item(
    session: SessionDep,
    name: str = Form(..., description="Item name"),
    description: str = Form(..., description="Description (color, brand, size, etc.)"),
    location: str = Form(..., description="Where did you lose it (Library, Hostel, Canteen...)"),
    item_date: date = Form(..., description="Date lost (YYYY-MM-DD)"),
    category: str = Form("Other", description="Category: Wallet, Phone, ID Card, Bag, Keys, Other"),
    identifying_mark: Optional[str] = Form(None, description="Identifying mark (sticker, scratch, etc.)"),
    owner_contact: Optional[str] = Form(None, description="Owner contact number (defaults to account contact)"),
    image: Optional[UploadFile] = File(None),
    current_user: User = Depends(get_current_user),
):
    """Mirrors C++ addLostItem(): Report a lost item with optional photo upload."""
    if category not in CATEGORIES:
        category = "Other"

    image_path = await save_image_upload(image)
    contact = owner_contact or current_user.contact

    item = ItemRecord(
        name=name,
        item_type="lost",
        description=description,
        category=category,
        location=location,
        item_date=item_date,
        reporter_id=current_user.id,
        owner_contact=contact,
        identifying_mark=identifying_mark,
        image_path=image_path,
        is_resolved=False,
    )
    session.add(item)
    session.commit()
    session.refresh(item)
    return {"message": f"Lost item reported. Its ID is {item.id}.", "item": item}


@app.post("/items/found", status_code=status.HTTP_201_CREATED)
async def add_found_item(
    session: SessionDep,
    name: str = Form(..., description="Item name"),
    description: str = Form(..., description="Description (color, brand, size, etc.)"),
    location: str = Form(..., description="Where did you find it (Library, Hostel, Canteen...)"),
    item_date: date = Form(..., description="Date found (YYYY-MM-DD)"),
    category: str = Form("Other", description="Category: Wallet, Phone, ID Card, Bag, Keys, Other"),
    where_kept: Optional[str] = Form(None, description="Where is the item kept now (e.g. security office, desk)"),
    finder_contact: Optional[str] = Form(None, description="Finder contact number (defaults to account contact)"),
    image: Optional[UploadFile] = File(None),
    current_user: User = Depends(get_current_user),
):
    """Mirrors C++ addFoundItem(): Report a found item with optional photo upload."""
    if category not in CATEGORIES:
        category = "Other"

    image_path = await save_image_upload(image)
    contact = finder_contact or current_user.contact

    item = ItemRecord(
        name=name,
        item_type="found",
        description=description,
        category=category,
        location=location,
        item_date=item_date,
        reporter_id=current_user.id,
        finder_contact=contact,
        where_kept=where_kept,
        image_path=image_path,
        is_resolved=False,
    )
    session.add(item)
    session.commit()
    session.refresh(item)
    return {"message": f"Found item reported. Its ID is {item.id}.", "item": item}


# ===========================================================================
# 4. VIEW ITEMS (mirrors C++ viewLostItems, viewFoundItems, viewAll)
# ===========================================================================
@app.get("/items/lost")
def view_lost_items(
    session: SessionDep,
    is_resolved: Optional[bool] = Query(None, description="Filter by resolved status"),
):
    """Mirrors C++ viewLostItems(): View all lost items."""
    stmt = select(ItemRecord).where(ItemRecord.item_type == "lost")
    if is_resolved is not None:
        stmt = stmt.where(ItemRecord.is_resolved == is_resolved)
    items = session.exec(stmt).all()
    return {"count": len(items), "lost_items": items}


@app.get("/items/found")
def view_found_items(
    session: SessionDep,
    is_resolved: Optional[bool] = Query(None, description="Filter by resolved status"),
):
    """Mirrors C++ viewFoundItems(): View all found items."""
    stmt = select(ItemRecord).where(ItemRecord.item_type == "found")
    if is_resolved is not None:
        stmt = stmt.where(ItemRecord.is_resolved == is_resolved)
    items = session.exec(stmt).all()
    return {"count": len(items), "found_items": items}


@app.get("/items")
def view_all_items(
    session: SessionDep,
    item_type: Optional[str] = Query(None, description="'lost' or 'found'"),
    category: Optional[str] = Query(None, description="Category filter"),
    is_resolved: Optional[bool] = Query(None, description="Filter resolved status"),
):
    """List items with optional filters."""
    stmt = select(ItemRecord)
    if item_type:
        stmt = stmt.where(ItemRecord.item_type == item_type)
    if category:
        stmt = stmt.where(ItemRecord.category == category)
    if is_resolved is not None:
        stmt = stmt.where(ItemRecord.is_resolved == is_resolved)

    items = session.exec(stmt).all()
    return {"count": len(items), "items": items}


# ===========================================================================
# 5. KEYWORD SEARCH (mirrors C++ searchItems & matches logic)
# ===========================================================================
@app.get("/items/search")
def search_items(keyword: str, session: SessionDep):
    """
    Mirrors C++ searchItems():
    Searches across name, description, category, and location (case-insensitive).
    """
    keyword_clean = keyword.strip()
    if not keyword_clean:
        raise HTTPException(status_code=400, detail="Search keyword cannot be empty.")

    # Fetch and filter using the C++ matches criteria
    all_items = session.exec(select(ItemRecord)).all()
    matched_items = [item for item in all_items if item.matches(keyword_clean)]

    return {
        "keyword": keyword_clean,
        "count": len(matched_items),
        "items": matched_items,
        "message": f"{len(matched_items)} item(s) matched." if matched_items else f'No items matched "{keyword_clean}".',
    }


# ===========================================================================
# 6. RESOLVE ITEM (mirrors C++ resolveItem with reporter check)
# ===========================================================================
@app.patch("/items/{item_id}/resolve")
def resolve_item(
    item_id: int,
    session: SessionDep,
    current_user: User = Depends(get_current_user),
):
    """
    Mirrors C++ resolveItem():
    Only the user who originally reported the item can mark it as resolved.
    """
    item = session.get(ItemRecord, item_id)
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No item with ID {item_id} was found.",
        )

    # C++ security rule: if (item->getReporterId() != currentUser->getUserId())
    if item.reporter_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only resolve items you reported.",
        )

    item.mark_resolved()
    session.add(item)
    session.commit()
    session.refresh(item)
    return {"message": f"Item {item_id} marked as resolved.", "item": item}


@app.get("/items/{item_id}")
def get_one_item(item_id: int, session: SessionDep):
    """Get complete item details by ID."""
    item = session.get(ItemRecord, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found.")
    return {"item": item}


@app.delete("/items/{item_id}")
def delete_item(
    item_id: int,
    session: SessionDep,
    current_user: User = Depends(get_current_user),
):
    """Delete an item and its uploaded image. Only the reporter can delete their item."""
    item = session.get(ItemRecord, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found.")

    if item.reporter_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only delete items you reported.")

    if item.image_path:
        Path(item.image_path.lstrip("/")).unlink(missing_ok=True)

    session.delete(item)
    session.commit()
    return {"message": f"Item {item_id} deleted."}


@app.put("/items/{item_id}")
def update_item_details(
    item_id: int,
    item_update: ItemUpdate,
    session: SessionDep,
    current_user: User = Depends(get_current_user),
):
    """Update item fields. Only the reporter can update their item."""
    item = session.get(ItemRecord, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found.")

    if item.reporter_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only edit items you reported.")

    update_data = item_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        if value is not None:
            setattr(item, key, value)

    session.add(item)
    session.commit()
    session.refresh(item)
    return {"message": f"Updated item {item_id}", "item": item}


# ===========================================================================
# 7. BACKWARD COMPATIBILITY ENDPOINTS (from original main.py)
# ===========================================================================
@app.get("/lost_items")
def get_tasks_legacy(session: SessionDep):
    data = session.exec(select(Lost_db)).all()
    return {"lost_items": data}


@app.get("/lost_items/{item_id}")
def get_one_task_legacy(item_id: int, session: SessionDep):
    data = session.get(Lost_db, item_id)
    if not data:
        raise HTTPException(status_code=404, detail="item not found")
    return {"item": data}


@app.post("/lost_items")
async def add_item_legacy(
    session: SessionDep,
    title: str = Form(...),
    found_date: date = Form(...),
    description: str = Form(...),
    image: UploadFile | None = File(None),
):
    image_path = await save_image_upload(image)
    new_item = Lost_db(
        title=title,
        found_date=found_date,
        description=description,
        image_path=image_path,
    )
    session.add(new_item)
    session.commit()
    session.refresh(new_item)
    return {"message": "item added", "item": new_item}


@app.delete("/lost_items/{item_id}")
def delete_task_legacy(item_id: int, session: SessionDep):
    data = session.get(Lost_db, item_id)
    if not data:
        raise HTTPException(status_code=404, detail="item not found")

    if data.image_path:
        Path(data.image_path.lstrip("/")).unlink(missing_ok=True)

    session.delete(data)
    session.commit()
    return {"message": f"Item {item_id} deleted"}


@app.put("/lost_items/{item_id}")
def update_item_legacy(item_id: int, item: LegacyItemUpdate, session: SessionDep):
    data = session.get(Lost_db, item_id)
    if not data:
        raise HTTPException(status_code=404, detail="task not found")
    data.title = item.title
    data.found_date = item.found_date
    data.description = item.description
    session.add(data)
    session.commit()
    session.refresh(data)
    return {"message": f"updated task {item_id}"}
