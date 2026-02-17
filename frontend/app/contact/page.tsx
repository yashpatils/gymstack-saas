import type { Metadata } from "next";
import { ContactClient } from "./contact-client";
import { toAbsoluteUrl } from "../lib/site";

export const metadata: Metadata = {
  title: "Contact GymStack | Sales and Support",
  description: "Contact GymStack to book a demo or submit a support request.",
  alternates: {
    canonical: toAbsoluteUrl("/contact"),
  },
};

export default function ContactPage() {
  return <ContactClient />;
}
