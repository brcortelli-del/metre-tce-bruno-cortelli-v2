"""Voix Edge en ligne, sans clé. Seul le texte fictif du tutoriel est envoyé."""
import argparse
import sys
import asyncio
from pathlib import Path
import edge_tts

async def main():
    p = argparse.ArgumentParser()
    p.add_argument('--text-file', required=True)
    p.add_argument('--output', required=True)
    p.add_argument('--voice', default='fr-FR-DeniseNeural')
    args = p.parse_args()
    text = Path(args.text_file).read_text(encoding='utf-8')
    if len(text) > 1200:
        raise ValueError('Une seule narration courte est attendue, pas un document entier.')
    if not text.strip():
        raise ValueError('Narration vide.')
    # Une tentative bornée. Les refus réseau ne sont pas contournés.
    await asyncio.wait_for(edge_tts.Communicate(text, args.voice, rate='-3%').save(args.output), timeout=90)
    if Path(args.output).stat().st_size < 512:
        raise ValueError('La synthèse n’a pas produit de fichier audio exploitable.')

if __name__ == '__main__':
    try:
        asyncio.run(main())
    except Exception as error:
        print(f'Edge TTS : {type(error).__name__} : {error}', file=sys.stderr)
        sys.exit(1)
