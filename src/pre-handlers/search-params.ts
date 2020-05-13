import type { TuftContext } from '../context';
import { URLSearchParams } from 'url';

export function createSearchParams() {
  return function searchParams(t: TuftContext) {
    t.request.searchParams = new URLSearchParams(t.request.search);
  };
}
