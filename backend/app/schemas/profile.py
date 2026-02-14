from pydantic import BaseModel, Field


class ProfileCreate(BaseModel):
    name: str = Field(max_length=200)
    education: str | None = Field(None, max_length=500)
    years_experience: int = 0
    age: int | None = None
    skills: list[str] = []
    resume_text: str | None = Field(None, max_length=50000)
    is_career_switcher: bool = False


class ProfileUpdate(BaseModel):
    name: str | None = Field(None, max_length=200)
    education: str | None = Field(None, max_length=500)
    years_experience: int | None = None
    age: int | None = None
    skills: list[str] | None = None
    resume_text: str | None = Field(None, max_length=50000)
    is_career_switcher: bool | None = None


class ProfileResponse(BaseModel):
    id: int
    user_id: int | None = None
    name: str
    education: str | None
    years_experience: int
    age: int | None
    skills: list[str]
    is_career_switcher: bool

    model_config = {"from_attributes": True}
