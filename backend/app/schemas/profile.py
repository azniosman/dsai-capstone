from pydantic import BaseModel


class ProfileCreate(BaseModel):
    name: str
    education: str | None = None
    years_experience: int = 0
    skills: list[str] = []
    resume_text: str | None = None
    is_career_switcher: bool = False


class ProfileResponse(BaseModel):
    id: int
    name: str
    education: str | None
    years_experience: int
    skills: list[str]
    is_career_switcher: bool

    model_config = {"from_attributes": True}
