"""Image-fetching schedules for imgserve.

Replaces schedule/random.py. Unlike the VNDB resource API, t.vndb.org exposes
no listing API, so there is no way to ask "what is new" - coverage can only be
discovered by probing sequential image ids. Two jobs:

  fetch_new_images_schedule       - probe ids upward from each type's current
                                    highest id, stopping after MISS_LIMIT
                                    consecutive misses (the end of the range).
                                    This is the only way to discover new
                                    images; random.py could only re-sample the
                                    ids already below the local maximum.

  fetch_thumbnail_images_schedule - create the missing '.t' thumbnail variant
                                    for every full-size image. VNDB generates a
                                    thumbnail for each cover/screenshot, so this
                                    is a deterministic, dead-end-free backfill.

Efficiency notes
----------------
* Forward progress. fetch_new starts from local_max + 1, so it only ever
  touches genuinely new ids instead of re-sampling known ones.
* Cheap skips. Ids already held locally are skipped without a download; only
  unknown ids hit t.vndb.org.
* Bounded work. MISS_LIMIT / *_PER_RUN cap the downloads attempted per run.
"""

import time

from .common import hourly_task
from imgserve.database import IMAGE_MODEL, exists, create

# Full-size image types probed by the frontier crawl.
FRONTIER_TYPES = ['cv', 'sf', 'ch']
# (full-size type, thumbnail type) pairs kept in sync.
THUMBNAIL_PAIRS = [('cv', 'cv.t'), ('sf', 'sf.t')]

MISS_LIMIT = 40         # consecutive misses that mark the end of a type's range
MAX_PER_RUN = 100       # cap on new images fetched per type per run
THUMBNAIL_PER_RUN = 200 # cap on thumbnails backfilled per pair per run
REQUEST_DELAY = 2       # seconds between downloads (politeness to t.vndb.org)


def _local_max_id(image_type):
    model = IMAGE_MODEL[image_type]
    newest = model.query.order_by(model.id.desc()).first()
    return newest.id if newest else 0

def _all_ids(image_type):
    model = IMAGE_MODEL[image_type]
    return {row[0] for row in model.query.with_entities(model.id).all()}


@hourly_task()
def fetch_new_images_schedule():
    """Discover new images by probing ids beyond each type's current maximum."""
    summary = {}
    for image_type in FRONTIER_TYPES:
        created = 0
        misses = 0
        image_id = _local_max_id(image_type) + 1
        while misses < MISS_LIMIT and created < MAX_PER_RUN:
            # create() downloads on insert; None means the id returned nothing.
            if create(image_type, image_id) is not None:
                created += 1
                misses = 0
            else:
                misses += 1
            image_id += 1
            time.sleep(REQUEST_DELAY)
        summary[image_type] = created
    print(f"[ImgServe] fetch_new_images created: {summary}")

@hourly_task(minute=30)
def fetch_thumbnail_images_schedule():
    """Create the missing '.t' thumbnail for every full-size image."""
    summary = {}
    for full_type, thumb_type in THUMBNAIL_PAIRS:
        missing = sorted(_all_ids(full_type) - _all_ids(thumb_type))[:THUMBNAIL_PER_RUN]
        created = 0
        for image_id in missing:
            if create(thumb_type, image_id) is not None:
                created += 1
            time.sleep(REQUEST_DELAY)
        summary[thumb_type] = created
    print(f"[ImgServe] fetch_thumbnail_images created: {summary}")
