"""Single source of truth for model tiers.

Previously TWO identical ModelTier enums coexisted (claude_client.py and the dead
deepseek_client.py); agent definitions imported the DeepSeek one while the live
client used its own. Cross-enum dict lookups only worked by str-Enum hash
coincidence — a latent bug, now removed along with the unused DeepSeek client.
"""
from enum import Enum


class ModelTier(str, Enum):
    HAIKU = "HAIKU"
    SONNET = "SONNET"
    OPUS = "OPUS"
