# Interact București Triumph

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- Public discovery and internal club operations are equal product priorities.
- Prospective volunteers in Bucharest learn about the club and find ways to participate. The club's age range is 12–18.
- Members use the portal to follow and participate in club activity.
- Board members and other authorized coordinators manage club operations according to their roles.

## Product Purpose

Support Interact București Triumph through a public website and an internal member portal. Help visitors understand the club and its activities, while helping members and organizers carry out club work.

Success serves both audiences: visitors can understand participation opportunities, and members can complete their recurring club tasks.

## Positioning

Interact București Triumph is sponsored by Rotary Cișmigiu. This product serves that club and its community. No additional claim of unique impact, scale, or differentiation has been confirmed.

## Operating Context

- Romanian is the main product language. Use Romanian diacritics in user-facing copy.
- The application lives in `triumph-website/`, beneath the repository root.
- Repository evidence shows a Next.js App Router application using React, TypeScript, Tailwind CSS, Payload CMS, and MongoDB.
- Public pages and the member portal share the frontend layout. Payload provides a separate administration interface.
- The existing development command is `pnpm dev`, run from `triumph-website/`. Runtime configuration and database access are required; the app was not started as part of initialization.

## Capabilities and Constraints

The following capabilities are present in repository code; their presence does not establish production availability or a commitment to expand them:

- Public club information, events and event registration, posts, galleries, team content, and contact/forms.
- Member authentication, password recovery, profiles, meeting information, QR check-in, attendance history, and absence motivations.
- Member dues information, projects, recruitment applications, interview scheduling, commissions, photo submissions, and club webmail access where enabled.
- Role-dependent member and board workflows, alongside CMS-managed pages, navigation, assets, forms, and configuration.

Preserve the distinction between public information and authenticated member/administrative actions. Respect existing role permissions when changing a workflow.

Open decisions: a more specific differentiating proposition, product-specific accessibility requirements, additional language requirements, and any binding brand standards beyond the confirmed name and sponsorship. No decision on these is implied by initialization.

## Brand Commitments

- The confirmed club name is **Interact București Triumph**.
- The confirmed sponsor is **Rotary Cișmigiu**; do not substitute a generic Rotary connection for that sponsorship when the sponsor is relevant.
- Romanian is the main language. Additional voice or personality requirements remain undecided.
- Existing identity assets are evidence for future work; initialization does not establish a new visual direction.

## Evidence on Hand

- Club identity assets: `triumph-website/public/logo.png`, `triumph-website/public/logo_full.png`, and `triumph-website/public/ClubLogo_Blue_Full.png`.
- Organization assets: `triumph-website/public/interact.png` and `triumph-website/public/rotary.png`.
- Club introduction copy and CMS defaults: `triumph-website/src/blocks/TriumphIntro/config.ts`.
- Operational roles and permissions: `triumph-website/src/utilities/membersAccess.ts`, `triumph-website/src/collections/Users/`, and the member routes under `triumph-website/src/app/(frontend)/members/`.
- The existing `triumph-website/README.md` largely documents the Payload website template; it is implementation background rather than a confirmed club brief.

No verified impact metrics, testimonials, participation totals, or additional partnership claims were supplied during initialization. Use approved content or request evidence before adding such claims.

## Product Principles

1. Give public discovery and internal operations equal weight when making product tradeoffs.
2. Make participation understandable for the club's 12–18 audience.
3. Keep recurring member and organizer tasks clear and appropriate to each user's role.
4. Use accurate Romanian and preserve the club's confirmed identity and sponsorship.
