"""Random-sampling image schedules - superseded by schedule/fetch.py.

These jobs sample random ids within the already-known id range. They are kept
for reference only: the import in imgserve/__init__.py is commented out, so
they are no longer registered with the scheduler. schedule/fetch.py replaces
them with a deterministic frontier crawl and thumbnail backfill.

Note the inherent limit of this approach: random_fetch_schedule samples
range(1, local_max + 1), so it can only re-fill gaps below the current
maximum - it can never discover images beyond it.
"""

import time
import random

from .common import hourly_task
from imgserve.database import IMAGE_MODEL, exists, create

# Image types sampled by random_fetch_schedule.
FETCH_TYPES = ['cv', 'sf', 'cv.t', 'sf.t', 'ch']

# (source type, target type) pairs cross-filled by random_update_schedule:
# ids present for the source but missing for the target are created.
UPDATE_PAIRS = [('cv.t', 'cv'), ('cv', 'cv.t'), ('sf.t', 'sf'), ('sf', 'sf.t')]

SAMPLE_SIZE = 10  # ids sampled per type / pair per run
ID_DELAY = 5      # seconds between per-id downloads
TYPE_DELAY = 60   # seconds between types


@hourly_task()
def random_fetch_schedule():
    """Sample random ids per type and create any that are missing locally."""
    created = {}

    def random_fetch(image_type):
        model = IMAGE_MODEL[image_type]
        newest = model.query.order_by(model.id.desc()).first()
        max_id = newest.id if newest else 0
        if max_id == 0:
            return
        ids = random.sample(range(1, max_id + 1), min(SAMPLE_SIZE, max_id))
        for image_id in ids:
            key = f"{image_type}:{image_id}"
            if exists(image_type, image_id):
                created[key] = False
            else:
                try:
                    created[key] = create(image_type, image_id) is not None
                except Exception as e:
                    print(f"Error creating {key}: {e}")
                    created[key] = False
            time.sleep(ID_DELAY)

    for image_type in FETCH_TYPES:
        random_fetch(image_type)
        time.sleep(TYPE_DELAY)

    print({'created': created})


@hourly_task()
def random_update_schedule():
    """Cross-fill each type pair: create target ids that exist for the source."""
    updated = {}

    def random_update(source_type, target_type):
        source_model = IMAGE_MODEL[source_type]
        source_ids = [item.id for item in source_model.query.all()]
        missing_in_target = [i for i in source_ids if not exists(target_type, i)]
        if not missing_in_target:
            return
        selected_ids = random.sample(missing_in_target, min(SAMPLE_SIZE, len(missing_in_target)))
        for image_id in selected_ids:
            key = f"{target_type}:{image_id}"
            try:
                updated[key] = create(target_type, image_id) is not None
            except Exception as e:
                print(f"Error creating {key}: {e}")
                updated[key] = False
            time.sleep(ID_DELAY)

    for source_type, target_type in UPDATE_PAIRS:
        random_update(source_type, target_type)
        time.sleep(TYPE_DELAY)

    print({'updated': updated})
