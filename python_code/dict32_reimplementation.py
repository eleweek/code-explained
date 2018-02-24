from common import DUMMY, NULL
from dict_reimpl_common import BaseDictImpl, Slot


class PyDictReimplementation(BaseDictImpl):
    START_SIZE = 8
    PERTURB_SHIFT = 5

    def __init__(self):
        BaseDictImpl.__init__(self)

    @staticmethod
    def signed_to_unsigned(hash_code):
        return 2**64 + hash_code if hash_code < 0 else hash_code

    def lookdict(self, key):
        hash_code = hash(key)
        perturb = self.signed_to_unsigned(hash_code)

        idx = hash_code % len(self.slots)
        while self.slots[idx].key is not NULL:
            if self.slots[idx].hash_code == hash_code and self.slots[idx].key == key:
                return idx

            idx = (idx * 5 + perturb + 1) % len(self.slots)
            perturb >>= self.PERTURB_SHIFT

        raise KeyError()

    def insertdict_clean(self, key, value):
        hash_code = hash(key)
        perturb = self.signed_to_unsigned(hash_code)

        idx = hash_code % len(self.slots)
        while self.slots[idx].key is not NULL and self.slots[idx].key is not DUMMY:
            if self.slots[idx].key == hash_code and self.slots[idx].key == key:
                break

            idx = (idx * 5 + perturb + 1) % len(self.slots)
            perturb >>= self.PERTURB_SHIFT

        fill_increased = self.slots[idx].key is NULL

        self.slots[idx] = Slot(hash_code, key, value)

        return fill_increased

    def resize(self):
        # TODO: proper target size (it is sometimes 2, sometimes 4 -- based on used)
        return self.base_resize(4)


def dump_py_reimpl_dict(d):
    return d.hashes, d.keys, d.values