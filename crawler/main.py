"""Entry point: python -m crawler.main --source michelin"""
import argparse
import asyncio
import logging

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")


def main() -> None:
    parser = argparse.ArgumentParser(description="FoodMap crawler")
    parser.add_argument("--source", required=True, choices=["michelin", "blueribon", "sikshin"])
    args = parser.parse_args()

    if args.source == "michelin":
        from crawler.runners.michelin import run
        asyncio.run(run())
    else:
        raise NotImplementedError(f"Crawler for '{args.source}' not yet implemented")


if __name__ == "__main__":
    main()
