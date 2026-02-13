import { render, screen } from '@testing-library/react';
import LandingPage from '../app/page';

describe('LandingPage testimonials section', () => {
  it('renders the testimonials section exactly once with a fixed number of cards', () => {
    const { rerender } = render(<LandingPage />);

    expect(
      screen.getAllByRole('heading', {
        name: /Teams Love the gymstack experience/i,
      }),
    ).toHaveLength(1);

    expect(screen.getByLabelText('Testimonials')).toBeInTheDocument();
    expect(screen.getAllByText(/COO, Peak Motion Studios|Head of Operations, Apex Athletics|Regional Director, Core Society/)).toHaveLength(3);

    rerender(<LandingPage />);

    expect(
      screen.getAllByRole('heading', {
        name: /Teams Love the gymstack experience/i,
      }),
    ).toHaveLength(1);
    expect(screen.getAllByText(/COO, Peak Motion Studios|Head of Operations, Apex Athletics|Regional Director, Core Society/)).toHaveLength(3);
  });
});
