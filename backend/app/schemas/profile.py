from typing import Optional, List
from pydantic import BaseModel, Field


class ProfileCreate(BaseModel):
    name: str = Field(max_length=200)
    education: Optional[str] = Field(None, max_length=500)
    years_experience: int = 0
    age: Optional[int] = None
    skills: List[str] = []
    resume_text: Optional[str] = Field(None, max_length=50000)
    is_career_switcher: bool = False


class ProfileUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=200)
    education: Optional[str] = Field(None, max_length=500)
    years_experience: Optional[int] = None
    age: Optional[int] = None
    skills: Optional[List[str]] = None
    resume_text: Optional[str] = Field(None, max_length=50000)
    is_career_switcher: Optional[bool] = None


class ProfileResponse(BaseModel):
    id: int
    user_id: Optional[int] = None
    name: str
    education: Optional[str]
    years_experience: int
    age: Optional[int]
    skills: List[str]
    is_career_switcher: bool

    model_config = {"from_attributes": True}
