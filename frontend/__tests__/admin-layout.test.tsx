import { describe, expect, it } from 'vitest';
import AdminRootLayout from '../app/admin/layout';

describe('admin root layout', () => {
  it('does not force auth redirect, avoiding access restricted redirect loops', () => {
    const element = AdminRootLayout({ children: <div>child</div> });
    expect(element).toBeTruthy();
  });
});
