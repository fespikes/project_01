#!/usr/bin/env python
# Licensed to Cloudera, Inc. under one
# or more contributor license agreements.  See the NOTICE file
# distributed with this work for additional information
# regarding copyright ownership.  Cloudera, Inc. licenses this file
# to you under the Apache License, Version 2.0 (the
# "License"); you may not use this file except in compliance
# with the License.  You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

"""
Very similar to the Django Paginator class, but easier to work with
when you don't have the full object list.
"""

import collections
from math import ceil

class InvalidPage(Exception):
    pass


class PageNotAnInteger(InvalidPage):
    pass


class EmptyPage(InvalidPage):
    pass

class Paginator(object):
  """
  Override certain methods of the Django Paginator to allow a partial object list.
  Does not support orphans.
  """
  def __init__(self, object_list, per_page, total=None, allow_empty_first_page=True):
    """
    Accepts a partial ``object_list``, for the purpose of offset and count calculation.

    The ``object_list`` is partial if and only if ``total`` is given. In that case,
    the list is the data for the *next* call to ``page()``.

    If the ``object_list`` is the full list, ``total`` must be None.
    """
    self.object_list = object_list
    self.per_page = int(per_page)
    self.orphans = 0
    self.allow_empty_first_page = allow_empty_first_page
    self._num_pages = self._count = None

    if total is None:
      self.object_list = object_list
    else:
      self.object_list = None
      self._partial_list = object_list

      self._count = total

  def validate_number(self, number):
    if self.object_list is None:
      return number
    try:
      number = int(number)
    except (TypeError, ValueError):
      raise PageNotAnInteger('That page number is not an integer')
    if number < 1:
      raise EmptyPage('That page number is less than 1')
    if number > self.num_pages:
      if number == 1 and self.allow_empty_first_page:
        pass
      else:
        raise EmptyPage('That page contains no results')
    return number

  def page(self, number):
    if self.object_list is None:
      # Use a partial list if there is one.
      # Make sure the length of the list agrees with the Page range.
      if self._partial_list is not None:
        res = Page(None, number, self)  # Set the object_list later; None for now
        n_objs = res.end_index() - res.start_index() + 1
        res.object_list = self._partial_list[:n_objs]
        self._partial_list = None       # The _partial_list is single-use
        return res
      # No data. Just a list of None's
      return Page((None,) * self.per_page, number, self)
    # Wrap that parent page in our Page class
    number = self.validate_number(number)
    bottom = (number - 1) * self.per_page
    top = bottom + self.per_page
    if top + self.orphans >= self.count:
      top = self.count
    pg = self._get_page(self.object_list[bottom:top], number, self)
    return Page(pg.object_list, pg.number, pg.paginator)

  def _get_count(self):
    """
    Returns the total number of objects, across all pages.
    """
    if self._count is None:
      try:
        self._count = self.object_list.count()
      except (AttributeError, TypeError):
        # AttributeError if object_list has no count() method.
        # TypeError if object_list.count() requires arguments
        # (i.e. is of type list).
        self._count = len(self.object_list)
    return self._count

  count = property(_get_count)

  def _get_num_pages(self):
    """
    Returns the total number of pages.
    """
    if self._num_pages is None:
      if self.count == 0 and not self.allow_empty_first_page:
        self._num_pages = 0
      else:
        hits = max(1, self.count - self.orphans)
        self._num_pages = int(ceil(hits / float(self.per_page)))
    return self._num_pages

  num_pages = property(_get_num_pages)

  def _get_page_range(self):
    """
    Returns a 1-based range of pages for iterating through within
    a template for loop.
    """
    return range(1, self.num_pages + 1)

  page_range = property(_get_page_range)

  def _get_page(self, *args, **kwargs):
    """
    Returns an instance of a single page.

    This hook can be used by subclasses to use an alternative to the
    standard :cls:`Page` object.
    """
    return Page(*args, **kwargs)


class Page(collections.Sequence):
  """
  Similar to the Django Page, with extra convenient methods.
  """
  def __init__(self, object_list, number, paginator):
    self.object_list = object_list
    self.number = number
    self.paginator = paginator

  def __repr__(self):
    return '<Page %s of %s>' % (self.number, self.paginator.num_pages)

  def __len__(self):
    return len(self.object_list)

  def __getitem__(self, index):
    if not isinstance(index, (slice, int, long)):
      raise TypeError
    # The object_list is converted to a list so that if it was a QuerySet
    # it won't be a database hit per __getitem__.
    if not isinstance(self.object_list, list):
      self.object_list = list(self.object_list)
    return self.object_list[index]

  def has_next(self):
    return self.number < self.paginator.num_pages

  def has_previous(self):
    return self.number > 1

  def has_other_pages(self):
    return self.has_previous() or self.has_next()

  def num_pages(self):
    return self.paginator.num_pages

  def total_count(self):
    return self.paginator.count

  def next_page_number(self):
    if self.has_next():
      return self.number + 1
    return self.number

  def previous_page_number(self):
    if self.has_previous():
      return self.number - 1
    return self.number


  def start_index(self):
    """
    Returns the 1-based index of the first object on this page,
    relative to total objects in the paginator.
    """
    # Special case, return zero if no items.
    if self.paginator.count == 0:
      return 0
    return (self.paginator.per_page * (self.number - 1)) + 1


  def end_index(self):
    """
    Returns the 1-based index of the last object on this page,
    relative to total objects found (hits).
    """
    # Special case for the last page because there can be orphans.
    if self.number == self.paginator.num_pages:
      return self.paginator.count
    return self.number * self.paginator.per_page