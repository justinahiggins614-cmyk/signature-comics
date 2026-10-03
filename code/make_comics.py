#!/usr/bin/env python3
"""The Signature Comic Store — deterministic original-comics generator.

Every issue is generated from seed SALT+i, so re-running never changes an
existing issue. All series, characters, places, and stories are ORIGINAL
Signature inventions — no real publisher's characters, titles, or likenesses.
Generated text is scanned with code/trademark_safe.py before storage.

Issue record:
  id, series, skey, num, title, chars[{name, code, power}], desc,
  pages[{cap, dlg, scene, beat}], words, note
"""
import random
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from trademark_safe import is_tm_clean

SALT = 20261002
AUTHOR = "Justin Addam Higgins"
GEN_NOTE = ("An original generated comic created by the Signature system. "
            "All characters, places, and events are invented.")

# ------------------------------------------------------------------ rng
class G:
    def __init__(self, seed):
        self.r = random.Random(seed)
    def pick(self, seq):
        return self.r.choice(seq)
    def sample(self, seq, k):
        k = min(k, len(seq))
        return self.r.sample(list(seq), k)
    def num(self, a, b):
        return self.r.randint(a, b)
    def shuffled(self, seq):
        s = list(seq); self.r.shuffle(s); return s

import re
_CHOICE_RE = re.compile(r"\{([^{}]*\|[^{}]*)\}")
def fill(g, template, ctx):
    def _c(m):
        return g.pick(m.group(1).split("|"))
    t = _CHOICE_RE.sub(_c, template)
    try:
        t = t.format(**ctx)
    except KeyError:
        pass
    t = t.replace("The the ", "The ").replace("the the ", "the ")
    return t

# ------------------------------------------------- invented-name pools
NA = ["Ka", "Mi", "Ro", "Ta", "Se", "Lu", "Na", "Ve", "Ri", "Do", "Fa",
      "Ze", "O", "E", "A", "Sha", "Bel", "Cor", "Del", "Fen", "Gal",
      "Hel", "I", "Jo", "Kel", "Lo", "Ma", "Ne", "Ol", "Pa", "Qu"]
NB = ["ren", "sha", "dor", "ven", "mir", "tal", "nor", "lia", "kem", "dara",
      "thon", "wick", "mar", "ston", "fell", "wen", "hal", "bris", "cott",
      "mere", "dine", "faro", "glen", "hollow", "bex", "sor", "tine", "vex"]
CA = ["Zy", "Kaa", "Vex", "On", "Syl", "Bren", "Thal", "Cor", "Dre", "Il",
      "Mae", "Ny", "Ol", "Pha", "Quo", "Rhe", "Sa", "Tre", "Ul", "Va"]
CB = ["phor", "lmir", "dora", "drel", "ka", "nix", "vos", "rine", "xor",
      "lith", "mara", "neth", "quis", "rak", "sel", "thune", "vix", "wren"]
CC = ["", "", "", "a", "e", "ia", "or", "us"]

def person_name(g):
    return (g.pick(NA) + g.pick(NB)).capitalize() + " " + \
           (g.pick(NA) + g.pick(NB)).capitalize()

def codename(g):
    c = (g.pick(CA) + g.pick(CB) + g.pick(CC))
    # avoid accidental real-word collisions handled by trademark scan later
    return c.capitalize() if len(c) > 2 else (g.pick(CA) + g.pick(CB)).capitalize()

# ------------------------------------------------------------- universe
# Each series: key, title, flavor, settings pool, power pool, place pool,
# arc beats (6 page beats), title patterns, caption/dialogue templates.
POWERS = {
    "signal": ["signal-jumping", "light-bending", "gravity anchoring",
               "echo-location pulses", "memory weaving", "star charting"],
    "ember": ["ember shaping", "flame warding", "stone singing",
              "beast speaking", "frost tracing", "wind riding"],
    "circuit": ["circuit diving", "hologram casting", "signal splicing",
                "machine listening", "ghost frequency tuning", "data weaving"],
    "tide": ["tide reading", "current riding", "deep listening",
             "storm weathering", "pearl diving", "whale singing"],
    "gloam": ["shadow listening", "thought sketching", "dust reading",
              "lantern guiding", "echo tracing", "fog walking"],
    "starlog": ["star charting", "void navigating", "signal decoding",
                "gravity slinging", "comet riding", "nebula mapping"],
    "clockwork": ["clockwork mending", "gear reading", "steam shaping",
                  "brass singing", "automaton waking", "timepiece tuning"],
    "junior": ["bubble shielding", "giggle sparks", "puddle jumping",
               "kite riding", "marble rolling", "firefly guiding"],
}

SETTINGS = {
    "signal": ["the Signal Spire", "orbit above Velnara", "the Quiet Array",
               "the Shattered Relay", "deep orbit", "the Beacon Fields"],
    "ember": ["the Ashen Vale", "Cinderhold Keep", "the Frostpine Reach",
              "the Ember Road", "the Hollow Mountain", "Duskwater Fen"],
    "circuit": ["Neon Row", "the Undergrid", "Sector Nine rooftops",
                "the Data Docks", "Chrome Alley", "the Quiet Server"],
    "tide": ["the Coral Steps", "open water past Gullrest", "the Sunken Bell",
             "Tidewater Market", "the Drowned Library", "Skerry Light"],
    "gloam": ["Lantern Row", "the Fog Docks", "Blackbrick Lane",
              "the Gloaming Stair", "Hollow Square", "the Night Market"],
    "starlog": ["the helm of the Wayfarer", "orbit of the Pale Twins",
                "the Drift", "a nameless moon", "the Long Dark",
                "the Cartographer's Reef"],
    "clockwork": ["Gearheart Plaza", "the Brass Works", "Cogsworth Lane",
                  "the Sky Dock", "the Tinker's Market", "Furnace Row"],
    "junior": ["Maple Street", "the Old Treehouse", "Sunnybrook Park",
               "the Library Steps", "Clover Field", "the Corner Store"],
}

PLACES = {
    "signal": ["Velnara Prime", "the Accord", "Relay Nine"],
    "ember": ["Cinderhold", "the Vale Compact", "Frostpine"],
    "circuit": ["the Sprawl", "the Grid Council", "Sector Nine"],
    "tide": ["Gullrest", "the Harbor Compact", "Skerry Light"],
    "gloam": ["Gloam City", "the Lantern Guild", "Hollow Ward"],
    "starlog": ["the Wayfarer", "the Far Cartography", "Pale Twins"],
    "clockwork": ["Cogsworth", "the Brass Guild", "Gearheart"],
    "junior": ["Maple Street", "Sunnybrook", "the Treehouse Club"],
}

BEATS = [
    ("hook", ["{hero} {races|hurries|streaks} toward {scene}, {power} flaring.",
              "Dawn breaks over {scene} — and {hero} is already {moving}.",
              "The call comes at {time}: {scene} needs {hero}."]),
    ("complication", ["But {scene2} holds a surprise: {foe_desc}.",
                      "{villain} has already been here — the signs are {signs}.",
                      "Halfway across {scene}, the plan {fails}."]),
    ("escalation", ["{hero} {pushes|digs deep|rallies}, {power2} answering the call.",
                    "The {artifact} {pulses|dims|shatters} — time is {running}.",
                    "{ally} arrives, {power3} blazing: \"{quips}\""]),
    ("turn", ["A {reveal} changes everything {hero} believed about {place}.",
              "\"{truth}\" — {villain}'s words land like {weight}.",
              "The {artifact} was never the prize. {hero} understands at last."]),
    ("climax", ["{hero} and {ally} stand together as {scene} {burns|shakes|sings}.",
                "One {final}: {power} against {power4}, and the {sky} holds its breath.",
                "{hero} {leaps|dives|charges} — for {place}, for {ally}, for everything."]),
    ("denouement", ["Quiet, after. {scene} {heals|settles|glows} in the aftermath.",
                    "{hero} looks to the {horizon}: \"{closer}\"",
                    "In {place}, they will tell this story for {years}."]),
]

TITLE_PATTERNS = {
    "signal": ["The {adj} Signal", "{place} Burning", "Relay of {nouns}",
               "The {nouns} Accord", "Echoes at {place}", "{hero}'s {noun2}"],
    "ember": ["{place} in Flames", "The {adj} Vale", "Ashes of {nouns}",
              "The {noun2} Road", "{hero} of {place}", "Ember over {place}"],
    "circuit": ["Neon {nouns}", "The {adj} Grid", "Ghosts of {place}",
               "{hero}'s Run", "Static {nouns}", "The {noun2} Protocol"],
    "tide": ["The {adj} Tide", "{place} Rising", "Songs of the {nouns}",
             "{hero}'s Crossing", "The {noun2} Light", "Deep {nouns}"],
    "gloam": ["The {adj} Lantern", "Shadows over {place}", "{hero}'s {noun2}",
              "The {nouns} Hour", "Fog at {place}", "The Last {noun2}"],
    "starlog": ["Log {num2}: {place}", "The {adj} Drift", "{nouns} of the Void",
                "{hero}'s Star", "Beyond {place}", "The {noun2} Reef"],
    "clockwork": ["The {adj} Gear", "{place} Wound Tight", "Brass {nouns}",
                  "{hero}'s Invention", "The {noun2} Engine", "Steam over {place}"],
    "junior": ["{hero} and the {adj} {noun2}", "The {nouns} Club",
               "Trouble at {place}", "{hero}'s Big {noun2}", "The {adj} Map",
               "Secrets of {place}"],
}

SERIES = [
    ("signal", "THE SIGNALBEARERS",
     "A team of cosmic guardians keeps the beacon-network of the far colonies lit — and something out in the dark keeps trying to snuff it."),
    ("ember", "EMBERFALL",
     "In a valley of ash and frost, young wardens carry living ember-flames between the last warm holds of the Vale."),
    ("circuit", "THE HOLLOW CIRCUIT",
     "Neon-row couriers who dive the city's ghost frequencies discover a signal that was never meant to be heard."),
    ("tide", "TIDEBOUND",
     "Harbor kids and old sailors bound by tide-oaths guard the sea-roads between Gullrest and the drowned places."),
    ("gloam", "THE GLOAMING WATCH",
     "Lantern-keepers patrol the fog city after dark, solving the small strange mysteries the daylight misses."),
    ("starlog", "STARFARER'S LOG",
     "An anthology of voyages: the survey ship Wayfarer charts the far dark, one strange world per issue."),
    ("clockwork", "THE CLOCKWORK MENAGERIE",
     "Tinkerers and their brass automatons keep the gear-city wound — and someone keeps loosening the springs."),
    ("junior", "JUNIOR SIGNALS",
     "The Maple Street kids and their treehouse club: small heroes, big heart, everyday wonders."),
]

ADJ = ["Silent", "Burning", "Hollow", "Bright", "Long", "Last", "First",
       "Hidden", "Wild", "Gentle", "Iron", "Paper", "Copper", "Velvet",
       "Amber", "Indigo", "Crimson", "Pale", "Restless", "Patient"]
NOUNS = ["Embers", "Tides", "Gears", "Signals", "Lanterns", "Echoes",
         "Storms", "Keys", "Maps", "Bells", "Bridges", "Stars"]
NOUN2 = ["Beacon", "Oath", "Key", "Map", "Bell", "Engine", "Lantern",
         "Compass", "Signal", "Bridge", "Chart", "Relay"]
ARTIFACTS = ["ember-lantern", "signal relay", "brass compass", "tide bell",
             "ghost tuner", "star chart", "cog heart", "fog lantern",
             "relay coil", "wayfinder's lens"]
VILLAINS = ["the Quiet", "the Hollow King", "Madame Static", "the Rust Choir",
            "Captain Undertow", "the Pale Cartographer", "the Gear Thief",
            "Old Murk", "the Signal Eater", "the Brass Widow"]
FOE_DESC = ["a rusted automaton with one lit eye", "three figures in fog-grey coats",
            "a hollow signal wearing a person's voice", "a tide-beast tangled in chain",
            "a courier gone quiet, eyes like static", "the Brass Widow's clockwork crows"]
SIGNS = ["scorch marks in a perfect ring", "footprints that stop mid-step",
         "a lantern burning cold blue", "gears laid out like a message",
         "silence where gulls should be", "frost on the inside of glass"]
QUIPS = ["Try keeping up.", "The night is young.", "I brought the loud one.",
         "You rang?", "Maps are just suggestions.", "Hold my lantern."]
TRUTHS = ["We were the storm all along", "The beacon was calling us home",
          "The map was drawn backwards", "The enemy kept our summers",
          "Every ending is a relay", "The quiet ones were listening"]
CLOSERS = ["Same time tomorrow.", "The light holds.", "Tell it true.",
           "Keep the signal lit.", "The tide always returns.",
           "Wind it tight."]
MOVING = ["mid-stride", "already moving", "laughing into the wind",
          "three steps ahead", "exactly on time"]
TIMES = ["first light", "the blue hour", "midnight", "low tide", "shift change"]
REVEALS = ["old map", "cracked lens", "folded letter", "rusted key",
           "tide-worn coin", "brass feather"]
WEIGHTS = ["a dropped anchor", "a closing door", "a struck bell",
           "a snapped string"]
SKIES = ["sky", "sea", "city", "vale"]
HORIZONS = ["horizon", "tide line", "rooftops", "treeline", "stars"]
YEARS = ["a hundred years", "seven winters", "a generation", "a long age"]


def _clean_name(g, maker, used):
    """Generate a name via maker() until it passes the trademark guard.

    Deterministic: draws from the issue rng, so the same seed always
    yields the same name. Falls back to a numbered safe name.
    """
    for _ in range(40):
        nm = maker(g)
        if nm not in used and is_tm_clean(nm):
            return nm
    k = 1
    while True:
        nm = "Sigmarion %d" % k
        if nm not in used and is_tm_clean(nm):
            return nm
        k += 1


def make_characters(g, skey, n):
    chars = []
    used = set()
    for _ in range(n):
        name = _clean_name(g, person_name, used); used.add(name)
        code = _clean_name(g, codename, used); used.add(code)
        chars.append({"name": name, "code": code,
                      "power": g.pick(POWERS[skey])})
    return chars


def make_issue(i):
    """Deterministic issue #i (1-based). Returns the full record dict."""
    g = G(SALT + i)
    skey, sname, sdesc = SERIES[(i - 1) % len(SERIES)]
    # issue number within its series
    num = (i - 1) // len(SERIES) + 1
    chars = make_characters(g, skey, g.num(2, 4))
    hero, ally = chars[0], chars[1] if len(chars) > 1 else chars[0]
    villain = g.pick(VILLAINS)
    ctx = {
        "hero": hero["code"], "ally": ally["code"], "villain": villain,
        "scene": g.pick(SETTINGS[skey]), "scene2": g.pick(SETTINGS[skey]),
        "place": g.pick(PLACES[skey]),
        "power": hero["power"], "power2": hero["power"], "power3": ally["power"],
        "power4": g.pick(POWERS[skey]),
        "artifact": g.pick(ARTIFACTS), "foe_desc": g.pick(FOE_DESC),
        "signs": g.pick(SIGNS), "quips": g.pick(QUIPS), "truth": g.pick(TRUTHS),
        "closer": g.pick(CLOSERS), "moving": g.pick(MOVING),
        "time": g.pick(TIMES), "reveal": g.pick(REVEALS),
        "weight": g.pick(WEIGHTS), "sky": g.pick(SKIES),
        "horizon": g.pick(HORIZONS), "years": g.pick(YEARS),
        "adj": g.pick(ADJ), "nouns": g.pick(NOUNS), "noun2": g.pick(NOUN2),
        "num2": str(g.num(100, 999)),
        "races": "races", "hurries": "hurries", "streaks": "streaks",
        "pushes": "pushes", "fails": "fails", "pulses": "pulses",
        "burns": "burns", "shakes": "shakes", "sings": "sings",
        "heals": "heals", "settles": "settles", "glows": "glows",
        "leaps": "leaps", "dives": "dives", "charges": "charges",
        "dims": "dims", "shatters": "shatters", "running": "running out",
        "final": "final exchange",
    }
    title = fill(g, g.pick(TITLE_PATTERNS[skey]), ctx)
    pages = []
    for beat, templates in BEATS:
        cap = fill(g, g.pick(templates), ctx)
        # dialogue line for most pages
        dlg = ""
        if g.num(0, 9) < 7:
            speaker = g.pick([hero, ally])
            dtemplates = [
                "\"{quips}\"", "\"{place} first. Everything else later.\"",
                "\"Did you feel that? The {artifact} just {pulses}.\"",
                "\"{villain} can't have gone far. Look for {signs}.\"",
                "\"Then we do it the loud way.\"",
                "\"{hero} — the {scene}! Now!\"",
            ]
            dlg = fill(g, g.pick(dtemplates), dict(ctx, pulses=g.pick(["pulsed", "dimmed", "sang"])))
            dlg = dlg.replace("{hero}", speaker["code"])
            dlg_speaker = speaker["code"]
        else:
            dlg_speaker = ""
        pages.append({"cap": cap, "dlg": dlg, "who": dlg_speaker,
                      "scene": ctx["scene"] if beat in ("hook", "denouement") else ctx["scene2"],
                      "beat": beat})
    desc = ("%s #%d — %s %s %s. Starring %s. %s" % (
        sname.title(), num, title,
        "A new chapter in the Signature heroes universe:",
        pages[0]["cap"],
        ", ".join(c["code"] + " (" + c["name"] + ")" for c in chars),
        sdesc))
    words = sum(len(p["cap"].split()) + len(p["dlg"].split()) for p in pages)
    rec = {
        "id": "JAH-COMIC-%06d" % i,
        "series": sname, "skey": skey, "num": num,
        "title": title, "chars": chars, "desc": desc,
        "pages": pages, "words": words, "note": GEN_NOTE,
        "creation_mode": "GENERATED",
    }
    return rec


def idx_row(rec):
    return {"id": rec["id"], "t": rec["title"], "s": rec["series"],
            "sk": rec["skey"], "n": rec["num"],
            "c": [c["code"] for c in rec["chars"]],
            "d": rec["desc"][:220], "w": rec["words"],
            "pg": len(rec["pages"])}
