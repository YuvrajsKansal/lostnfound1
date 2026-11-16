from contextlib import asynccontextmanager
from datetime import date, datetime
from pathlib import Path
from typing import Annotated, Optional
from fastapi import Depends, FastAPI,HTTPException
from fastapi import File, Form, UploadFile
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from sqlmodel import SQLModel, Session, create_engine,Field, select
import uuid

engine = create_engine("sqlite:///lost.db")

class Lost_db(SQLModel,table =True):
    id :Optional[int] = Field(default = None,primary_key = True)
    title :str = Field(default=None)
    found_date:date = Field(default=None)
    description:str = Field(default=None)
    image_path: Optional[str]=None

@asynccontextmanager
async def lifespan(app:FastAPI):
    SQLModel.metadata.create_all(engine)
    yield
app=FastAPI(lifespan=lifespan)

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

ALLOWED_TYPES = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}
MAX_SIZE = 5 * 1024 * 1024

def get_session():
    with Session(engine) as session:
        yield session
SessionDep = Annotated[Session, Depends(get_session)]
class Item(BaseModel):
    title :str = Field(default=None)
    found_date: date = Field(default=None)
    description:str = Field(default=None)


@app.get("/lost_items")
def get_tasks(session:SessionDep):
    data=session.exec(select(Lost_db)).all()
    return{"lost_items":data}

@app.get("/lost_items/{item_id}")
def get_one_task(item_id:int,session:SessionDep):
    data = session.get(Lost_db,item_id)
    if not data:
        raise HTTPException(status_code=404,detail="item not found")
    return {"item":data}
    

        
@app.post("/lost_items")
def add_item(
    session: SessionDep,
    title: str = Form(...),
    found_date: date = Form(...),
    description: str = Form(...),
    image: UploadFile | None = File(None),
):
    image_path = None
    if image and image.filename:
        ext = ALLOWED_TYPES.get(image.content_type)
        if not ext:
            raise HTTPException(status_code=400, detail="Only JPEG, PNG or WEBP images allowed")
        data = image.file.read(MAX_SIZE + 1)
        if len(data) > MAX_SIZE:
            raise HTTPException(status_code=413, detail="Image too large (max 5 MB)")
        filename = f"{uuid.uuid4().hex}{ext}"
        (UPLOAD_DIR / filename).write_bytes(data)
        image_path = f"/uploads/{filename}"

    new_item = Lost_db(title=title, found_date=found_date,
                       description=description, image_path=image_path)
    session.add(new_item)
    session.commit()
    session.refresh(new_item)
    return {"message": "item added", "item": new_item}

@app.delete("/lost_items/{item_id}")
def delete_task(item_id: int, session: SessionDep):
    data = session.get(Lost_db, item_id)
    if not data:
        raise HTTPException(status_code=404, detail="item not found")

    if data.image_path:
        Path(data.image_path.lstrip("/")).unlink(missing_ok=True)

    session.delete(data)
    session.commit()
    return {"message": f"Item {item_id} deleted"}
    
@app.put("/lost_items/{item_id}")
def update_item(item_id:int,item:Item,session:SessionDep):
    data = session.get(Lost_db,item_id)
    if not data:
            raise HTTPException(status_code=404,detail="task not found")
    data.title = item.title
    data.found_date = item.found_date
    data.description = item.description
    session.add(data)
    session.commit()
    session.refresh(data)
    return {"message":f"updated task {item_id}"}

