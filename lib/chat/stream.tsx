import { Subject } from 'rxjs';

export const textStream$ = new Subject<string>();

export const completeStream$ = new Subject<void>();
