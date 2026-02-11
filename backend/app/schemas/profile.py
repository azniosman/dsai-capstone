from pydantic import BaseModel


class ProfileCreate(BaseModel):
    name: str
    education: str | None = None
    years_experience: int = 0
    age: int | None = None
    skills: list[str] = []
    resume_text: str | None = None
    is_career_switcher: bool = False


class ProfileUpdate(BaseModel):
    name: str | None = None
    education: str | None = None
    years_experience: int | None = None
    age: int | None = None
    skills: list[str] | None = None
    resume_text: str | None = None
    is_career_switcher: bool | None = None


class ProfileResponse(BaseModel):
    id: int
    name: str
    education: str | None
    years_experience: int
    age: int | None
    skills: list[str]
    is_career_switcher: bool

    model_config = {"from_attributes": True}
