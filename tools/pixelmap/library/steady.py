"""Eras in which an object may look the same as one era earlier, because the real thing did not change.

The owner ruled on 2026-11-15: no forced era differences. A clock face, gear or other token added only to make one era
differ from the last became what players named, so it is banned. Where the real object kept its form, list the era here
with the reason, and vcheck lets it match the era before. Each entry: object id -> {era: reason}, or {"*": reason}
for every era. Only list what the identity card's may_vary.era says did not change.
"""

STEADY = {
}


def steady(oid, era):
    """True when the object may look as it did one era earlier in this era."""
    e = STEADY.get(oid, {})
    return "*" in e or era in e
