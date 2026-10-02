#!/usr/bin/env python3
"""The Signature Comic Store — hero archetype catalog builder.

Hand-authored, Signature-ORIGINAL heroes covering every classic archetype
(the powerhouse, the speedster, the dark vigilante, the web-slinger type,
the extraordinary team, the cosmic guardian, ...). Every name is scanned
with code/trademark_safe.py before storage; the script refuses to write if
any name fails the guard.

Output: data/heroes.json (list of hero records).
Each hero: id, code (codename), name, archetype, powers[], look{desc,suit,cape},
backstory, series, note.
"""
import json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from trademark_safe import is_tm_clean

ROOT = os.path.dirname(HERE)
OUT = os.path.join(ROOT, "data", "heroes.json")

ORIGIN_NOTE = ("Signature-original character, not affiliated with any "
               "publisher. Created by the Signature system for Justin Addam Higgins.")

# (codename, real name, archetype, powers, look_desc, suit, cape, backstory, series)
RAW = [
 ("BASTION", "Doran Kells", "The Powerhouse",
  ["flight", "near-invulnerability", "thunderclap strength", "deep-space survival"],
  "A broad-shouldered guardian in cobalt plate with a silver sunburst crest.",
  "#1d4fd6", "#c8d4f2",
  "Doran Kells was a harbor salvage diver when a fallen star-core fused with his "
  "diving bell. Now, as Bastion, he holds up collapsing bridges, tows stranded "
  "ships home, and stands between the city and anything that falls out of the sky.",
  "THE SIGNALBEARERS"),

 ("SWIFTSURE", "Pip Marlow", "The Speedster",
  ["supersonic running", "vibration phasing", "lightning reflexes", "time-slip sprints"],
  "A lean runner in scarlet and gold, motion-lines stitched into the suit.",
  "#d62e1d", "#ffd23f",
  "Pip Marlow was the fastest bicycle courier on Neon Row until a ghost-frequency "
  "storm rewrote their nerves. As Swiftsure they outrun weather, deliver hope on "
  "deadline, and never, ever stand still.",
  "THE HOLLOW CIRCUIT"),

 ("NIGHTWARDEN", "Silas Crowe", "The Dark Vigilante",
  ["peak human conditioning", "fear tactics", "gadget mastery", "criminal psychology"],
  "A tall figure in charcoal armor and a tattered midnight cape, white lenses.",
  "#23232e", "#0c0c14",
  "Silas Crowe watched his family's lantern-shop burn and decided the fog city "
  "needed someone the dark was afraid of. As the Nightwarden he patrols the "
  "rooftops with no powers but preparation — and a promise.",
  "THE GLOAMING WATCH"),

 ("STRANDLINE", "Jess Amara", "The Web-Slinger Type",
  ["grapple-line swinging", "wall-crawling", "tensile web-nets", "acrobatics"],
  "A teen hero in teal and copper with a climbing harness woven into the costume.",
  "#0f8b8d", "#b87333",
  "Jess Amara built her first grapple-gun from a harbor crane winch for a school "
  "science fair. As Strandline she swings between the docks and the rooftops, "
  "catching falling cargo — and falling people — with homemade tensile lines.",
  "TIDEBOUND"),

 ("THE KINDRED", "The Kindred Five", "The Extraordinary Team",
  ["elemental fusion", "empathic link", "combined-form titan", "danger-sense web"],
  "Five young heroes in matching indigo jackets, each with a different elemental sigil.",
  "#3b2f7a", "#7a6ff0",
  "Five strangers struck by the same falling signal woke up changed — and linked. "
  "As the Kindred they are stronger together than apart, a found family learning "
  "that extraordinary is just ordinary with practice.",
  "JUNIOR SIGNALS"),

 ("STARWARDEN", "Ilya Voss", "The Cosmic Guardian",
  ["prism-light projection", "gravity anchoring", "beacon-speech", "void navigation"],
  "A serene guardian in white and deep blue, a living constellation on the cloak.",
  "#eef2ff", "#1b2456",
  "Ilya Voss was the last keeper of a dead beacon-station until the light chose "
  "them back. As Starwarden they keep the lanes between colonies lit and answer "
  "every distress call the dark tries to swallow.",
  "STARFARER'S LOG"),

 ("PLATEFORGE", "Rosa Delgado", "The Armored Tinkerer",
  ["modular power armor", "forge-drones", "overcharge blast", "field repairs"],
  "A stocky engineer in brass-and-rust plate armor that reconfigures mid-battle.",
  "#8a5a1e", "#3a2a12",
  "Rosa Delgado built her first suit from a decommissioned furnace-bot to save her "
  "gear-city block. As Plateforge she never stops iterating — every fight ends "
  "with a better suit than it started with.",
  "THE CLOCKWORK MENAGERIE"),

 ("RUNESAYER", "Tam Okafor", "The Mystic",
  ["rune-casting", "ward weaving", "spirit parley", "ley-line sight"],
  "A calm figure in deep green robes traced with glowing copper runes.",
  "#14532d", "#b87333",
  "Tam Okafor read the old signs the city paved over. As the Runesayer they speak "
  "with what lingers — warding doors, bargaining with echoes, and keeping the "
  "balance between the seen and the unseen.",
  "THE GLOAMING WATCH"),

 ("SHIELDMAIDEN SABLE", "Sable Venn", "The Mythic Warrior",
  ["century-honed combat", "blessed arms", "battle-cry rally", "oath-binding"],
  "A towering warrior in bronze scale-mail with a crimson plume crest.",
  "#a06a2c", "#8e1f2f",
  "Sable Venn swore her oath on a battlefield a hundred years gone and simply "
  "never stopped keeping it. She fights for the small holds and the forgotten "
  "valleys, and her war-cry has ended sieges before the first arrow.",
  "EMBERFALL"),

 ("PRISMWARD", "Noor Haddad", "The Prismatic Warden",
  ["prism-blade", "rainbow-bridge", "color-shift camouflage", "light-lattice"],
  "A shining sentinel in white with a prismatic sash that shifts through every color.",
  "#f5f5f5", "#7ad0ff",
  "Noor Haddad grew up in a lighthouse and learned to split light into ladders. "
  "As Prismward they bend the spectrum into blades, bridges, and second chances — "
  "a warden of every color the eye can hold.",
  "THE SIGNALBEARERS"),

 ("PLIANT", "Detective Bram Flex", "The Elastic Detective",
  ["elastic body", "contortion infiltration", "rebound strikes", "master deduction"],
  "A lanky detective in a mustard trench coat that stretches with him.",
  "#c9a227", "#5a4a1a",
  "Detective Bram Flex bent the rules long before his body learned to bend. As "
  "Pliant he squeezes through keyholes, bounces back from betrayals, and always "
  "follows the case to its elastic end.",
  "THE GLOAMING WATCH"),

 ("MAGNITUDE", "June Park", "The Size-Changer",
  ["giant growth", "pocket shrinking", "density shifting", "stomp-quake control"],
  "A cheerful hero in orange and navy whose silhouette never stays the same size.",
  "#e8762c", "#1d3a6b",
  "June Park was a harbor crane operator who always wished she could reach a "
  "little further. As Magnitude she can stand tall as a lighthouse or small as "
  "a minnow — and she uses both to keep the sea-roads safe.",
  "TIDEBOUND"),

 ("TIDECROWN", "Marisol Reyes", "The Ocean Warden",
  ["tide command", "pressure immunity", "storm calming", "sea-speech"],
  "A regal figure in deep teal scale-armor crowned with living coral.",
  "#0e5f6b", "#4fe3c1",
  "Marisol Reyes was chosen by the drowned places to speak for the sea. As "
  "Tidecrown she keeps the oaths between harbor folk and the deep — and when "
  "the storms forget their manners, she reminds them.",
  "TIDEBOUND"),

 ("GALEFORGE", "Torvald Ashe", "The Storm Heir",
  ["storm-summoning", "lightning riding", "wind-forged weapons", "sky-sight"],
  "A broad warrior in storm-grey with crackling blue-white energy braided in the beard.",
  "#4a5568", "#9fd0ff",
  "Torvald Ashe inherited the sky-anvil of his grandmother, the last storm-smith. "
  "As Galeforge he hammers weather into weapons and shields, and his thunder "
  "only ever strikes what deserves it.",
  "EMBERFALL"),

 ("UMBRASTEP", "Vesper Lane", "The Shadow Teleporter",
  ["shadow-stepping", "darkness veil", "umbral blades", "night-sight"],
  "A slight figure in smoke-grey and violet who is never quite where you look.",
  "#3d3350", "#1a1426",
  "Vesper Lane fell through a crack in the evening and learned to walk the dark "
  "between places. As Umbrastep they arrive before trouble starts — usually.",
  "THE HOLLOW CIRCUIT"),

 ("BRIARCLAW", "Rowan Thicket", "The Feral Guardian",
  ["retractable thorn-claws", "beast senses", "regeneration", "pack rally"],
  "A wild guardian in bark-brown leathers with thorn-claws and moss-green markings.",
  "#5a4632", "#2e4a2e",
  "Rowan Thicket grew up in the deep fen and never quite left it. As Briarclaw "
  "they guard the wild places with tooth and claw — and a heart bigger than the "
  "forest.",
  "EMBERFALL"),

 ("VOIDHERALD", "Cassiop Lark", "The Cosmic Herald",
  ["faster-than-light flight", "cosmic awareness", "nova-flare bolts", "omen-sense"],
  "A silver herald wreathed in comet-light, trailing stardust.",
  "#c0c8e8", "#39406b",
  "Cassiop Lark was a survey pilot who flew too far and came back changed — now "
  "they carry warnings between the stars. As the Voidherald they arrive ahead of "
  "disaster, which is almost as good as preventing it.",
  "STARFARER'S LOG"),

 ("MOUNTAINHEART", "Gromm", "The Gentle Giant",
  ["colossal strength", "stone skin", "earth-healing touch", "avalanche calm"],
  "A mountain of a being with granite skin and kind lantern-eyes.",
  "#6b6259", "#3f3a33",
  "Gromm is older than the valley and gentler than its rain. As Mountainheart he "
  "lifts fallen barns, shelters villages in his shadow, and has never once raised "
  "a hand in anger — only in rescue.",
  "EMBERFALL"),

 ("SPROCKET", "Tilda Nack", "The Gadget Kid",
  ["junk-tech invention", "drone swarm", "gadget improvisation", "mechanical empathy"],
  "A small whirlwind in patched overalls with a backpack of buzzing contraptions.",
  "#7a4fa3", "#2e1d3e",
  "Tilda Nack can fix anything with wire, hope, and a paperclip. As Sprocket she "
  "fights entropy itself — one jerry-rigged miracle at a time.",
  "THE CLOCKWORK MENAGERIE"),

 ("KINGSWARD", "General Adaeze Obi", "The Peak Tactician",
  ["master strategy", "peak conditioning", "unbreakable will", "allied rally"],
  "A commanding figure in midnight blue and gold with a chess-knight sigil.",
  "#1d2a6b", "#c9a227",
  "General Adaeze Obi has never lost a battle she chose to fight. As Kingsward "
  "she needs no powers — only a plan, a team, and the absolute refusal to lose "
  "anyone under her command.",
  "THE SIGNALBEARERS"),
]

def main():
    heroes = []
    bad = []
    for i, (code, name, arch, powers, look, suit, cape, backstory, series) in enumerate(RAW, 1):
        hid = "JAH-HERO-%06d" % i
        for label, text in (("codename", code), ("name", name), ("backstory", backstory)):
            if not is_tm_clean(text):
                bad.append((hid, label, text))
        heroes.append({
            "id": hid, "code": code, "name": name, "archetype": arch,
            "powers": powers,
            "look": {"desc": look, "suit": suit, "cape": cape},
            "backstory": backstory, "series": series, "note": ORIGIN_NOTE,
        })
    if bad:
        print("TRADEMARK FAILURES:")
        for b in bad:
            print(" ", b)
        sys.exit(1)
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(heroes, f, ensure_ascii=False, indent=1)
    print("WROTE %d heroes -> %s (all trademark-clean)" % (len(heroes), OUT))

if __name__ == "__main__":
    main()
