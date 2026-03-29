{
  "system_category": "CRM",
  "description": "Customer Relationship Management (CRM) software centralizes customer and prospect data and coordinates sales, marketing, service, and relationship processes across channels to improve revenue outcomes, customer satisfaction, and operational visibility.",
  "user_personas": [
    {
      "role": "Sales Representative",
      "typical_goals": "Find and qualify leads, manage opportunities through defined stages, log customer interactions, generate quotes, and hit targets while maintaining an accurate pipeline."
    },
    {
      "role": "Account Executive",
      "typical_goals": "Own a portfolio of accounts, develop account plans, drive expansion/renewal, coordinate internal stakeholders, and keep forecast accuracy high."
    },
    {
      "role": "Sales Manager",
      "typical_goals": "Monitor pipeline health, coach reps, manage territories/assignments, approve discounts, improve win rates, and produce reliable forecasts."
    },
    {
      "role": "Marketing Operations Specialist",
      "typical_goals": "Build segments, execute multi-step campaigns/journeys, align lead routing and scoring with sales, measure campaign performance, and maintain consent/preferences."
    },
    {
      "role": "Customer Support Agent",
      "typical_goals": "Intake and resolve cases efficiently, follow SLAs, collaborate internally, reuse knowledge, and document outcomes for customer history and reporting."
    },
    {
      "role": "Support/Service Manager",
      "typical_goals": "Manage queues and staffing, monitor SLA compliance, improve first-contact resolution, maintain a knowledge program, and reduce escalations."
    },
    {
      "role": "Customer Success Manager",
      "typical_goals": "Track onboarding and adoption, manage renewals/expansion signals, coordinate follow-ups, maintain health scores, and reduce churn."
    },
    {
      "role": "Partner/Channel Manager",
      "typical_goals": "Onboard partners, manage deal registration and co-selling, distribute content, track partner performance, and ensure clean attribution of sourced revenue."
    },
    {
      "role": "CRM/System Administrator",
      "typical_goals": "Configure objects/fields, roles and permissions, automation, integrations, data quality controls, and ensure stability, security, and auditability."
    },
    {
      "role": "Data Steward / Privacy Officer",
      "typical_goals": "Maintain data quality and deduplication, manage consent and communication preferences, support retention/deletion processes, and ensure compliance reporting."
    },
    {
      "role": "Executive / Business Leader",
      "typical_goals": "Review dashboards for pipeline, revenue, customer health, and service performance; validate forecasts; and make staffing and investment decisions using reliable metrics."
    },
    {
      "role": "External Customer (Self-Service User)",
      "typical_goals": "Search knowledge, submit and track support requests, manage profile and communication preferences, and access relevant account/service information."
    }
  ],
  "modules_pool": [
    {
      "module_name": "Customer and Account Data Management",
      "description": "Maintains the system of record for customers, prospects, organizations, individuals, and relationships, enabling a unified view across sales, marketing, and service.",
      "common_features": [
        "Account and contact profiles (including hierarchies, relationship roles, and interaction history)",
        "Lead capture and basic qualification data (web forms, imports, referrals, manual entry)",
        "Data import/export, normalization, duplicate detection, and merge workflows",
        "Customer communication preferences, consent tracking, and contactability rules",
        "Activity timeline and engagement capture (emails, calls, meetings, notes, attachments)"
      ],
      "typical_screens": [
        "Account record workspace (overview, related lists, hierarchy view)",
        "Contact/individual record workspace (profile, roles, relationship mapping)",
        "Lead record workspace (qualification view and next steps)",
        "Activity timeline / interaction history view",
        "Duplicate review and merge console"
      ]
    },
    {
      "module_name": "Sales Pipeline and Deal Management",
      "description": "Supports revenue generation from lead/opportunity through close, including pipeline progression, forecasting, and sales productivity tooling.",
      "common_features": [
        "Opportunity management with configurable stages, close dates, and probability models",
        "Pipeline visualization (list, kanban, funnel) with filtering by owner, territory, product, and period",
        "Sales forecasting, quotas/targets, rollups, and manager adjustments",
        "Tasking, cadences/sequences, and guided selling (playbooks, recommended actions)",
        "Approvals for discounts, exceptions, and deal desk processes"
      ],
      "typical_screens": [
        "Pipeline dashboard (kanban and funnel views)",
        "Opportunity workspace (stage progression, stakeholders, next steps)",
        "Forecast dashboard (team rollup, commits, best-case, pipeline coverage)",
        "Sales cadence/sequences builder and execution view",
        "Approval inbox (deal desk / discount approvals)"
      ]
    },
    {
      "module_name": "Marketing Automation and Campaign Orchestration",
      "description": "Plans, executes, and measures campaigns across channels, with segmentation, nurturing, attribution, and lead routing to sales.",
      "common_features": [
        "Segmentation and audience/list management (dynamic segments, suppression rules)",
        "Campaign planning, execution, and tracking across channels (email, forms, events, social, ads where supported)",
        "Journey/nurture automation with branching logic, timing controls, and re-entry rules",
        "Lead scoring models and routing rules (including sales handoff and service-level response tracking)",
        "Attribution, ROI reporting, and multi-touch influence analytics"
      ],
      "typical_screens": [
        "Campaign calendar and campaign workspace",
        "Segment/list builder with filters and preview",
        "Journey automation canvas (workflow designer for nurturing)",
        "Email/message editor and send performance view",
        "Attribution and campaign influence dashboards"
      ]
    },
    {
      "module_name": "Service, Support, and Case Management",
      "description": "Manages customer support interactions from intake through resolution, including routing, SLA tracking, knowledge, self-service, and escalations.",
      "common_features": [
        "Case/ticket intake, categorization, prioritization, and routing (queues, skills-based, rules, round-robin)",
        "SLA/entitlement management with timers, milestones, and breach escalation rules",
        "Knowledge management (authoring, approvals, versioning, and search surfaced in-agent and self-service)",
        "Omnichannel interactions (email-to-case, chat, messaging, phone integration where supported) with unified customer context",
        "Escalations, internal collaboration, and resolution codes/root-cause capture for continuous improvement"
      ],
      "typical_screens": [
        "Agent console (customer context + case workspace + suggested knowledge)",
        "Case queue and assignment view",
        "SLA/milestone tracking view (breach risk indicators)",
        "Knowledge authoring and publishing workspace",
        "Customer self-service portal (knowledge search + case submission/status)"
      ]
    },
    {
      "module_name": "Products, Pricing, Quotes, and Order Lifecycle",
      "description": "Supports structured selling with product catalogues, pricing rules, quoting, approvals, and handoff to downstream order/billing processes (where implemented).",
      "common_features": [
        "Product catalogue and price books (including bundles, add-ons, and multi-currency where supported)",
        "Quote creation with line items, discounting rules, taxes/fees placeholders, and document generation",
        "Configuration and pricing rules (basic CPQ-style constraints and guided configuration where supported)",
        "Approvals and audit trails for pricing exceptions and contract terms (including e-signature handoff where integrated)",
        "Order/contract/subscription handoff (orders, renewals, amendments) with integration points to finance/ERP billing systems"
      ],
      "typical_screens": [
        "Product and price book management screens",
        "Quote builder (line items, bundles, discounts, proposal preview)",
        "Pricing/discount approval dashboard",
        "Contract or subscription summary workspace",
        "Order summary and fulfillment status view (when implemented)"
      ]
    },
    {
      "module_name": "Partner and Channel Relationship Management",
      "description": "Enables indirect sales models by supporting partner onboarding, deal registration, shared pipelines, co-marketing, and partner performance tracking.",
      "common_features": [
        "Partner onboarding, profile management, and tiering/certification tracking",
        "Deal registration and lead sharing with validation rules and conflict management",
        "Partner portal experiences (content library, training, referrals, and support access)",
        "Co-selling workflows (shared opportunities, role-based visibility, joint account planning)",
        "Partner performance analytics (pipeline, sourced revenue, conversion rates, compliance)"
      ],
      "typical_screens": [
        "Partner portal home/workspace",
        "Deal registration submission and approval view",
        "Partner account/profile and tier status view",
        "Co-sell opportunity workspace (shared access controls)",
        "Partner scorecard dashboards"
      ]
    },
    {
      "module_name": "Analytics, Reporting, and Intelligence",
      "description": "Provides operational and executive visibility via reports, dashboards, KPI tracking, and optional AI-driven insights for prioritization and forecasting.",
      "common_features": [
        "Configurable reports and dashboards (sales, marketing, service, and customer health KPIs)",
        "Pipeline and revenue analytics (conversion rates, cycle time, coverage, stage aging, win/loss)",
        "Service analytics (volume, backlog, SLA adherence, time-to-first-response, resolution time)",
        "Predictive/assisted insights (lead/opportunity scoring, churn risk indicators, anomaly alerts where supported)",
        "Data export and BI integration patterns (scheduled extracts, semantic models, API-based analytics access)"
      ],
      "typical_screens": [
        "Executive KPI dashboard (cross-functional overview)",
        "Report builder (filters, groupings, calculated fields where supported)",
        "Pipeline analytics dashboard (stage aging, conversion, coverage)",
        "Service performance dashboard (SLA and queue health)",
        "Insight and alert centre (recommendations, anomalies)"
      ]
    },
    {
      "module_name": "Platform Administration, Security, Automation, and Integrations",
      "description": "Enables configuration, extensibility, automation, governance, and connectivity to external systems while enforcing security and auditability.",
      "common_features": [
        "Security model administration (roles, teams, field-level security, sharing rules, and access reviews)",
        "Workflow and process automation (rules, approvals, assignments, scheduled jobs, event triggers where supported)",
        "Customization and extensibility (custom objects, fields, page layouts, validation rules, and UI components)",
        "Integration tooling (APIs, webhooks, middleware patterns, event queues, and connector management)",
        "Audit logging, compliance controls, retention policies, and environment management (sandboxes/releases where supported)"
      ],
      "typical_screens": [
        "Admin setup/configuration console",
        "Automation designer (workflow/process and approval configuration)",
        "Integration manager (API keys, connectors, webhook endpoints)",
        "Roles/permissions matrix and sharing model views",
        "Audit log and compliance reporting view"
      ]
    }
  ],
  "high_level_entities": [
    {
      "entity": "Account",
      "general_relationships": "An Account has Many Contacts and Many Opportunities; an Account can have a Parent Account and Many Child Accounts (hierarchy)."
    },
    {
      "entity": "Contact",
      "general_relationships": "A Contact belongs to One Primary Account (common pattern) and can be linked to Multiple Accounts via relationship roles; a Contact can be related to Many Activities, Cases, and Opportunities."
    },
    {
      "entity": "Lead",
      "general_relationships": "A Lead represents an unqualified person or organization; a Lead can be converted into an Account and/or Contact and optionally an Opportunity."
    },
    {
      "entity": "Opportunity",
      "general_relationships": "An Opportunity is associated with One Account and can involve Many Contacts (stakeholders); an Opportunity can have Many Line Items and can generate One or Many Quotes."
    },
    {
      "entity": "Opportunity Line Item",
      "general_relationships": "An Opportunity Line Item links an Opportunity to a Product with quantity, price, and discount; an Opportunity can have Many Line Items."
    },
    {
      "entity": "Product",
      "general_relationships": "A Product can appear in Many Price Books and be referenced by Many Quotes, Opportunities, and Orders."
    },
    {
      "entity": "Price Book",
      "general_relationships": "A Price Book contains Many Price Book Entries (product-price pairs) and can be associated to Opportunities or Quotes depending on implementation."
    },
    {
      "entity": "Quote",
      "general_relationships": "A Quote is typically created for One Opportunity and contains Many Quote Line Items; a Quote may be approved and then converted into an Order/Contract (where implemented)."
    },
    {
      "entity": "Quote Line Item",
      "general_relationships": "A Quote Line Item references a Product and captures configured pricing; a Quote has Many Quote Line Items."
    },
    {
      "entity": "Order",
      "general_relationships": "An Order can be created from an accepted Quote or Opportunity and contains Many Order Line Items; an Order may relate to a Contract/Subscription and integrate to billing/ERP."
    },
    {
      "entity": "Contract",
      "general_relationships": "A Contract is associated with One Account and may cover Many Products/Entitlements; a Contract can have renewals, amendments, and related Orders (depending on model)."
    },
    {
      "entity": "Campaign",
      "general_relationships": "A Campaign targets Many Leads and Contacts (campaign members); a Campaign can influence Many Opportunities through attribution models."
    },
    {
      "entity": "Segment or Marketing List",
      "general_relationships": "A Segment contains Many Contacts/Leads based on rules; a Segment is used by Campaigns and Journeys as an entry audience."
    },
    {
      "entity": "Journey or Automation Flow",
      "general_relationships": "A Journey enrolls Many Leads/Contacts based on Segment criteria and triggers Activities or message sends; Journeys often write back engagement and scoring changes."
    },
    {
      "entity": "Activity",
      "general_relationships": "An Activity (task/call/meeting) can be associated with a Lead, Contact, Account, Opportunity, Case, or multiple via links; users create Many Activities."
    },
    {
      "entity": "Interaction or Conversation",
      "general_relationships": "An Interaction captures communications metadata (email/chat/message/voice summary) and links to One or Many Contacts/Cases/Opportunities for a unified timeline."
    },
    {
      "entity": "Case",
      "general_relationships": "A Case is linked to an Account and optionally a Contact; a Case can reference Knowledge Articles and can be routed to a Queue and assigned to a User."
    },
    {
      "entity": "Queue",
      "general_relationships": "A Queue holds Many Cases (or leads/tasks in some CRMs) and routes work to Users or Teams based on assignment rules."
    },
    {
      "entity": "Entitlement",
      "general_relationships": "An Entitlement defines support coverage for an Account or Contract; an Entitlement governs SLA rules applied to Cases."
    },
    {
      "entity": "SLA or Milestone",
      "general_relationships": "An SLA/Milestone is applied to Many Cases via Entitlements and tracks time-based commitments; breaches trigger escalations or notifications."
    },
    {
      "entity": "Knowledge Article",
      "general_relationships": "A Knowledge Article can be linked to Many Cases and be visible to Agents and/or Customers via a Portal; articles typically require approvals and versioning."
    },
    {
      "entity": "Partner",
      "general_relationships": "A Partner is often modeled as an Account with a partner type; a Partner can register Many Deals and participate in Many Co-sell Opportunities."
    },
    {
      "entity": "Deal Registration",
      "general_relationships": "A Deal Registration is submitted by a Partner and may create or link to a Lead/Opportunity; approvals enforce conflict rules and attribution."
    },
    {
      "entity": "User",
      "general_relationships": "A User owns and updates Many records (Accounts, Opportunities, Cases, Activities) and is assigned Roles/Permissions that govern access."
    },
    {
      "entity": "Role and Permission Set",
      "general_relationships": "Roles and Permission Sets define access and can be assigned to Many Users; they control create/read/update/delete and field-level visibility across entities."
    },
    {
      "entity": "Territory",
      "general_relationships": "A Territory groups Accounts and Opportunities for assignment and forecasting; a Territory can have child territories and many Users assigned."
    },
    {
      "entity": "Workflow Rule or Automation",
      "general_relationships": "Automation rules listen to record changes (create/update/time/event) and can update fields, create tasks, route work, or call integrations."
    },
    {
      "entity": "Integration Connector",
      "general_relationships": "An Integration Connector links the CRM to external systems (email, ERP, support channels, identity); it exchanges data for Many entities through mappings and events."
    },
    {
      "entity": "Attachment or Document",
      "general_relationships": "Documents can be attached to Many records (cases, opportunities, quotes) and follow retention and access controls."
    },
    {
      "entity": "Consent or Preference Record",
      "general_relationships": "Consent/Preference records are linked to Contacts (and sometimes Accounts) and govern allowed channels, purposes, and marketing eligibility."
    },
    {
      "entity": "Work Order",
      "general_relationships": "A Work Order can be created from a Case or Asset and can have Many Service Appointments; work orders are assigned to technicians or vendors (optional field service pattern)."
    },
    {
      "entity": "Asset or Installed Base Item",
      "general_relationships": "An Asset belongs to an Account and may relate to Contracts/Entitlements; Assets are referenced by Cases and Work Orders to support service history."
    }
  ],
  "common_workflows": [
    {
      "workflow_name": "Lead Capture to Qualification",
      "steps": [
        "Capture lead from form, import, event, referral, or manual entry",
        "Normalize and enrich lead data (validation, dedupe check, missing fields)",
        "Assign owner and queue using routing rules (territory, product interest, geography, or round-robin)",
        "Perform qualification activities (calls/emails/meetings) and update lead status and score",
        "Decide outcome: convert, nurture, disqualify, or recycle to a queue"
      ]
    },
    {
      "workflow_name": "Lead Conversion",
      "steps": [
        "Confirm lead is qualified and meets conversion criteria",
        "Select or create the target Account and Contact (and optionally create an Opportunity)",
        "Map lead fields to account/contact/opportunity fields and merge duplicates if detected",
        "Create follow-up tasks and enroll in post-conversion sequences or onboarding steps",
        "Mark lead as converted and preserve traceability to originating campaign and activities"
      ]
    },
    {
      "workflow_name": "Opportunity Management and Forecasting",
      "steps": [
        "Create an opportunity linked to the account and set expected close metadata",
        "Add stakeholders, competitors, next steps, and qualification notes",
        "Progress through defined stages while logging activities and updating amounts/probabilities",
        "Run forecast rollups and submit commit/best-case categories for the period",
        "Manager reviews pipeline health, adjusts forecast where policy allows, and triggers coaching actions"
      ]
    },
    {
      "workflow_name": "Campaign Execution to Sales Handoff",
      "steps": [
        "Define campaign goals, audience segments, and suppression/consent rules",
        "Build assets and journeys (emails, landing pages, event registrations, nurture sequences)",
        "Launch campaign and monitor deliverability, engagement, and conversion metrics",
        "Score engagements and route sales-ready leads to the appropriate sales queue/owner",
        "Measure influence/attribution and feed outcomes back into future segmentation and content decisions"
      ]
    },
    {
      "workflow_name": "Quote to Order",
      "steps": [
        "Select price book and add products/bundles to a quote from an opportunity",
        "Apply discounting and pricing rules; generate the customer-facing proposal document",
        "Submit quote for approvals (discount thresholds, non-standard terms, margin rules)",
        "Send quote for customer acceptance (and e-signature handoff if integrated)",
        "Convert accepted quote into an order/contract/subscription and notify downstream fulfillment/billing systems (where applicable)"
      ]
    },
    {
      "workflow_name": "Case Intake to Resolution",
      "steps": [
        "Create case from email, portal submission, chat, phone, or internal creation",
        "Categorize, set priority, and apply entitlement/SLA rules",
        "Route case to a queue and assign to an agent using skills and workload rules",
        "Investigate and resolve using knowledge, collaboration, and customer communications",
        "Close case with resolution code and update related records (customer health, root cause, follow-up tasks)"
      ]
    },
    {
      "workflow_name": "Knowledge Article Lifecycle",
      "steps": [
        "Identify knowledge gap from case trends or new product changes",
        "Draft article with structured metadata (category, audience, product, keywords)",
        "Submit for review and approval (technical, legal, brand, or support leadership)",
        "Publish to agent-only or customer-visible channels with versioning",
        "Measure article effectiveness (deflection, reuse rate, feedback) and iterate or retire content"
      ]
    },
    {
      "workflow_name": "Partner Deal Registration and Co-Sell",
      "steps": [
        "Partner submits a deal registration with customer and opportunity details",
        "System validates for conflicts and completeness; routes for approval",
        "Approved registration creates or links to lead/opportunity and assigns internal owner",
        "Partner and internal team collaborate on opportunity milestones and share documents",
        "Close opportunity with attributed sourced/influenced revenue reporting for partner performance"
      ]
    },
    {
      "workflow_name": "Data Import, Deduplication, and Governance",
      "steps": [
        "Load data via import tool, integration feed, or migration batch",
        "Validate schemas, required fields, and reference mappings (accounts, products, users)",
        "Run duplicate detection, matching rules, and merge proposals",
        "Apply data stewardship review for exceptions and confirm merges",
        "Publish data quality dashboards and enforce ongoing validation rules and audit logging"
      ]
    }
  ]
}