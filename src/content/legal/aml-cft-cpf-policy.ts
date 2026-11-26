import type { LegalDocument } from "./types";

// Generated from the approved policy text. Edit the wording here, not in the page component.
export const amlPolicy: LegalDocument = {
  "slug": "aml-policy",
  "title": "AML, CFT and CPF Policy",
  "subtitle": "Anti-money laundering, counter-terrorist financing and counter-proliferation financing",
  "organisation": "Apexlogic Innovations Ltd operating StrivePay",
  "status": {
    "label": "Approved · Effective 1 September 2026",
    "tone": "approved"
  },
  "meta": [
    {
      "label": "Version",
      "value": "2.0"
    },
    {
      "label": "Effective",
      "value": "1 September 2026"
    },
    {
      "label": "Approval recorded",
      "value": "8 October 2026"
    },
    {
      "label": "Next scheduled review",
      "value": "1 September 2027"
    }
  ],
  "intro": [
    "This policy develops the existing Apexlogic Anti Money Laundering Policy and Procedure for StrivePay customer onboarding, payments and virtual asset services. It retains the original commitments to customer due diligence, internal reporting, annual training and periodic review, and adds detailed controls for money laundering, terrorist financing and proliferation financing.",
    "Management approved this policy on 8 October 2026 with an effective date of 1 September 2026. Approval establishes the company policy requirements; it does not attest that newly documented controls operated before approval."
  ],
  "sections": [
    {
      "id": "section-1",
      "heading": "1. Purpose scope and legal framework",
      "paragraphs": [
        "Money laundering includes concealing or disguising criminal proceeds and moving or converting them to appear legitimate. Terrorist financing can involve lawful or unlawful funds used to support terrorists or terrorist activity. Proliferation financing concerns funding connected to weapons of mass destruction and related prohibited activity.",
        "This policy applies to directors, employees, contractors, agents and service providers acting for Apexlogic in all StrivePay business lines. It covers individuals, companies, beneficial owners, authorised representatives, counterparties and virtual asset wallets. A third party arrangement does not remove Apexlogic responsibility for its own controls or regulatory obligations.",
        "The legal framework includes the Money Laundering Prevention and Prohibition Act 2022, Terrorism Prevention and Prohibition Act 2022, Nigerian Financial Intelligence Unit Act 2018 and Nigeria Data Protection Act 2023. Applicable SEC rules, AML/CFT/CPF regulations, sanctions directions and partner requirements must be maintained in a legal obligations register. Counsel must confirm the current consolidated rules and the regulatory classification of each StrivePay activity.",
        "The company must obtain any permissions required for its own activity. The Quidax API agreement is a contractual service arrangement; it does not transfer Quidax regulatory approval to Apexlogic. No new service, asset, customer category or jurisdiction may be launched without documented legal and compliance clearance."
      ]
    },
    {
      "id": "section-2",
      "heading": "2. Governance and responsibility",
      "paragraphs": [
        "The Board approves this policy, risk appetite, resources and material exceptions and receives at least quarterly compliance reports. Senior management ensures controls are implemented before services are enabled and promptly resolves material findings.",
        "Chike Romanus Udeze is the company AML legal adviser. He provides legal advice on AML obligations and applicability. This designation does not itself appoint him as the AMLO. The designated Anti Money Laundering Officer or Money Laundering Reporting Officer, referred to here as the AMLO, owns risk assessment, EDD decisions, screening escalation, suspicious activity review, regulatory reporting and liaison with Quidax and other providers. A deputy must cover absences. The AMLO has direct access to the Board and sufficient authority and independence to restrict activity.",
        "Operations collects and checks onboarding evidence, monitors queues and escalates concerns. Engineering maintains access controls, audit logs, monitoring integrations, geographic controls and change records. All staff must report concerns immediately and protect confidentiality. An independent reviewer tests the programme at least annually and after material change; independence may be provided by a suitably qualified external reviewer if there is no internal audit function."
      ]
    },
    {
      "id": "section-3",
      "heading": "3. Business and customer risk assessment",
      "paragraphs": [
        "The AMLO documents a business wide risk assessment at least annually and whenever products, countries, providers or delivery channels change. It considers Nigerian and relevant sector risk assessments, fraud typologies, sanctions exposure, non face to face onboarding, asset types, wallet counterparties and outsourcing risk.",
        "Each customer must have a documented low, medium or high risk rating before transactional approval. Assess identity quality, residence and incorporation, occupation or industry, ownership transparency, PEP status, credible adverse information, expected value and volume, source of funds, delivery channel and virtual asset exposure. Record the rationale, assessor, date and evidence. Missing information cannot justify a low rating.",
        "Low risk means verified identity, transparent ownership and a credible ordinary activity profile with no material elevated indicators. Medium risk means elevated but manageable indicators, such as a higher expected volume or more complex activity. High risk includes PEPs and relevant connected persons, unexplained ownership complexity, credible financial crime concerns, significant high risk geographic exposure or unusual activity requiring EDD. A prohibition or unresolved sanctions match overrides any risk rating and prevents approval.",
        "Compliance may raise a rating immediately; lowering requires recorded reasons and approval. As internal review standards, review high risk customers at least every six months, medium risk customers annually and low risk customers every two years. All customers are reviewed sooner after a change of ownership, sanctions alert, material transaction change, document expiry or other trigger. These intervals do not replace stricter law or partner requirements."
      ]
    },
    {
      "id": "section-4",
      "heading": "4. Individual identity verification",
      "paragraphs": [
        "Before enabling transactions, collect legal name, date of birth, nationality, residence and address, contact details, occupation, purpose of account, expected activity and source of funds. Verify identity using reliable independent information and valid identification, supported by proof of address and document authenticity checks appropriate to risk. BVN or NIN checks may supplement Nigerian onboarding where lawful and relevant; a correctly formatted number alone is not identity verification.",
        "For remote onboarding, use an approved verification provider or a documented manual process that addresses impersonation, forged documents and account takeover. Where appropriate, require selfie and liveness or an equivalent reliable identity binding control. Check that the applicant matches the document and reconcile material discrepancies before approval.",
        "StrivePay uses Sumsub for KYC and customer screening, including verification of shareholders and UBOs. Quidax performs wallet address screening for the crypto services provided through its arrangement with Apexlogic, as confirmed by management on 8 October 2026. The AMLO must retain the configured service scope and relevant screening evidence; no underlying analytics vendor, network coverage or screening frequency is assumed.",
        "The AMLO maintains a provider register specifying the legal provider entity, country and product coverage, verification steps, screening coverage, audit evidence, subcontractors, data handling and fallback procedures. Third party results must be accessible and linked to the customer record. Do not claim a provider performs sanctions screening or EDD solely because it performs identity verification.",
        "If verification is incomplete, fails or conflicts with other evidence, withhold transactional approval, seek clarification and assess whether an internal suspicious activity report is warranted. Do not create anonymous, fictitious or inadequately identified accounts. Record approved limits and verification status and prevent unauthorised overrides."
      ]
    },
    {
      "id": "section-5",
      "heading": "5. Corporate onboarding and beneficial ownership",
      "paragraphs": [
        "Obtain legal name, registration number, incorporation and operating countries, registered and business address, constitutional documents, registry evidence, directors, authorised signatories, business purpose, expected activity, source of funds and authority to open and operate the account. Check the business against reliable registry records and verify representative authority.",
        "Identify the natural persons who ultimately own or control the customer through direct or indirect interests or other control. Use 25 percent ownership as the internal starting threshold, or any lower threshold required by applicable law, partner rules or risk. Do not treat this threshold as permission to ignore control below it. Trace intermediate companies, nominees, trusts and other arrangements to the natural person and document an ownership diagram and evidence.",
        "Verify identified UBOs and controllers using reliable independent evidence and apply sanctions, PEP and adverse information screening. For trusts and similar arrangements identify the relevant settlor, trustees, protector, beneficiaries or beneficiary class and other ultimate controllers as applicable. If reasonable enquiries identify no natural owner or controller, record the enquiries and identify and verify the relevant senior managing official, subject to applicable rules and AMLO review; this must not conceal opaque ownership.",
        "Collect updated ownership information on material changes and at periodic review. Do not approve a company when ownership, control or operating legitimacy cannot be established. Provider hosted KYB must be supported by accessible evidence of UBO verification, not just a status label or the identity of the account administrator."
      ]
    },
    {
      "id": "section-6",
      "heading": "6. Screening and targeted financial sanctions",
      "paragraphs": [
        "Screen customers, UBOs, directors, controllers and authorised signatories before approval, periodically during the relationship and promptly after relevant list updates. Screening must cover applicable Nigerian and United Nations sanctions, and other sanctions lists required by law, service exposure or contract. Include PEPs, relevant family members and close associates, and credible adverse media and regulatory or enforcement watchlists.",
        "Use an approved screening system with documented data sources, update frequency, matching settings and audit history. A documented manual check is permitted only where it provides adequate coverage and timely updates. Review potential matches using names, aliases, date of birth, nationality and other identifiers. Record false positive reasoning and escalation decisions; staff must not dismiss matches without evidence.",
        "An unresolved sanctions match prevents approval or transaction release. A confirmed applicable designation must be handled without delay under the relevant freeze, prohibition and reporting requirements, with legal and AMLO direction. Preserve funds and evidence lawfully; do not alert the subject improperly. PEP status is a risk factor requiring EDD and senior management approval, rather than an automatic prohibition. Adverse media requires assessment of source credibility, severity and relevance."
      ]
    },
    {
      "id": "section-7",
      "heading": "7. Enhanced due diligence",
      "paragraphs": [
        "EDD is required for high risk customers, PEPs and relevant connected persons, complex or opaque structures, material high risk country exposure, unusual transaction patterns, credible adverse information, inconsistent identity information and other triggers identified by law or providers. Suspicion requires escalation regardless of customer value or risk rating.",
        "EDD includes further independent identity and ownership checks, corroborated source of funds and source of wealth, business rationale, expected counterparties and wallet activity, additional address or business evidence and a documented assessment of the risks. Obtain bank statements, income or business records, sale or inheritance evidence or other proportionate reliable documents; a declaration alone is insufficient where risk requires corroboration.",
        "The AMLO reviews EDD and obtains senior management approval before establishing or continuing the relationship. Apply lower limits, restricted features, additional pre transaction review and more frequent monitoring as appropriate. Record outstanding items and do not release restricted activity until resolved. Refuse or end relationships where risk cannot be managed, subject to reporting, preservation and legal obligations."
      ]
    },
    {
      "id": "section-8",
      "heading": "8. Customer acceptance and geographic restrictions",
      "paragraphs": [
        "Prohibit customers subject to applicable sanctions, anonymous or fictitious accounts, illegal activity, unverifiable identity or ownership, forged documentation, terrorist or proliferation activity, and activity outside the company's lawful service permissions. Prohibit customers and transactions covered by Quidax current prohibited country schedule and other applicable provider restrictions.",
        "As risk appetite restrictions, require AMLO and senior management review of unlicensed financial or virtual asset businesses, gambling, high cash intensity businesses, charities with higher risk geographic exposure, arms related activities and complex nominee structures. Acceptance also requires legality, partner permission and manageable risk.",
        "Maintain an approved country and industry register showing the source, effective date, service scope and decision. FATF increased monitoring is a risk input, not automatically a comprehensive sanctions ban. Country eligibility must be assessed separately for each service and provider; a country supported by one provider is not necessarily permitted by Quidax or legally authorised for Apexlogic."
      ]
    },
    {
      "id": "section-9",
      "heading": "9. Transaction monitoring and wallet screening",
      "paragraphs": [
        "Apexlogic must maintain internal oversight of transaction activity and provider alerts. Monitoring must cover fiat and virtual asset movement, linked accounts and aggregation across time, not merely single transaction limits. Define expected customer behaviour and approved limits and compare actual activity against it.",
        "Proposed scenarios include rapid movement or conversion, structuring, unusual velocity or value, activity inconsistent with profile or source of funds, third party funding, repeated failed or rejected transfers, unexplained cross border flows, newly changed beneficiary details and links to scams, illicit markets, mixers or sanctioned addresses. Document scenario thresholds, owners, frequency and rationale in a controlled monitoring procedure and test effectiveness before production use.",
        "Where virtual asset transfers are enabled, use approved blockchain analytics or wallet screening, directly or through an evidenced provider arrangement, before release where available and during ongoing monitoring. Record network, wallet, transaction identifier, screening time, exposure, result and disposition. Screening must consider relevant direct and indirect exposure and counterparty risk; a syntactically valid wallet is not a screened wallet.",
        "Hold or restrict suspicious or high risk activity pending review where legally and operationally appropriate. Review alerts promptly with customer history, KYC, linked transactions and provider evidence. Preserve the case, decision, reviewer and action. A provider rejection or failed AML status must not be overridden by rerouting through another provider.",
        "The AMLO must establish who performs each control internally and externally and obtain contractual or written confirmation of provider coverage and access to alerts. If a required control is unavailable or coverage is unverified, restrict the affected activity until an adequate approved process exists. A provider relationship alone is not proof of transaction monitoring or blockchain screening."
      ]
    },
    {
      "id": "section-10",
      "heading": "10. Travel Rule for virtual asset transfers",
      "paragraphs": [
        "Management currently assesses the Travel Rule as not applicable to StrivePay operating model. The basis must be recorded with advice from Chike Romanus Udeze, the AML legal adviser. Applicability must be reviewed when services, transfer arrangements, jurisdictions or regulatory requirements change. The following requirements apply only if a route becomes subject to the Travel Rule. Before enabling such a transfer route, the AMLO and legal adviser determine applicable obligations, thresholds, required fields and counterparties under current law and partner rules. Assess the requirements on all relevant sides of the transfer and document any route specific conditions. Do not infer an exemption from a small transfer amount or a self hosted wallet.",
        "For covered transfers, obtain and verify required originator information and obtain required beneficiary information, including names, account or wallet identifiers and additional identifying data required by applicable rules. Conduct counterparty VASP due diligence and exchange required data securely through an approved interoperable channel before or with the transfer as required. Retain transmission and receipt evidence without placing sensitive identity data on a public blockchain.",
        "For missing, incomplete or inconsistent data, pause and request correction, reject or restrict the transfer as appropriate and assess suspicious activity. For self hosted wallets, establish whether the wallet is hosted or self hosted and apply required ownership or control verification, wallet screening and additional risk checks. A wallet type field or VASP name alone does not establish Travel Rule compliance.",
        "If Quidax or another provider performs the Travel Rule function, obtain written confirmation of its scope, participating routes, information exchange method, failure handling and responsibilities retained by Apexlogic. Do not enable a covered route without a documented adequate process. Maintain a route register and periodic effectiveness testing."
      ]
    },
    {
      "id": "section-11",
      "heading": "11. IP address and geographic controls",
      "paragraphs": [
        "Collect the client IP and relevant session data at registration and sign in, and at sensitive actions or transaction submission where implemented and necessary. Use a trusted edge configuration to resolve the client address, verify the proxy trust boundary and prevent user supplied headers from bypassing geographic checks.",
        "The control design uses IP geolocation alongside declared residence, incorporation, identity evidence and provider country rules. Restricted registration must be blocked according to the approved service specific country register. Tor, anonymous proxies, unexplained location mismatches and other evasion indicators require restriction or review according to the approved procedure. An IP location is a risk indicator and is not proof of residence or identity.",
        "Under this policy, an unavailable essential geographic check must pause the affected activity or require documented equivalent verification and AMLO approval before release. Restrict any activity from prohibited jurisdictions under applicable law or contract; travel or a VPN must not bypass restrictions.",
        "Record IP, time, event, country result, decision and reason proportionately. Give appropriate privacy notice, limit access and retention, and protect geographic and identity data. Maintain documented exceptions and review them without allowing exceptions to sanctions prohibitions."
      ]
    },
    {
      "id": "section-12",
      "heading": "12. Suspicious activity reporting and confidentiality",
      "paragraphs": [
        "Employees, contractors and business partners must report knowledge or suspicion of money laundering, terrorist financing or proliferation financing to the AMLO or deputy immediately. Reports should identify the reporter, time, customer and associated parties, relevant transactions, facts and reasons for suspicion and any Apexlogic or StrivePay involvement.",
        "The AMLO records receipt and promptly examines the facts without delaying applicable reporting. For reporting entities, the NFIU states that STRs must be filed immediately and no later than 24 hours after establishing reasons for suspicion. Legal and Compliance must confirm entity specific filing duties, channel and current guidance; internal review must not be used to extend a statutory deadline. File through the required channel and retain acknowledgements, including any separate lawful partner notification.",
        "Do not wait for proof of a crime or use a monetary threshold to exclude suspicious activity. The AMLO documents both decisions to report and decisions not to report with reasons. Separate internal reports and STR materials from ordinary customer records and restrict access. Never disclose a report, intended report or investigation in a way that constitutes tipping off. Handle freezes, disclosure requests and law enforcement enquiries under verified authority.",
        "Maintain a reporting calendar for all applicable threshold reports and regulatory returns, with deadlines and accountable owners. Partner reporting must not be assumed to replace Apexlogic own reporting duties."
      ]
    },
    {
      "id": "section-13",
      "heading": "13. Records privacy and outsourcing",
      "paragraphs": [
        "Keep customer identity and verification, ownership, risk and EDD, screening, transaction and wallet data, Travel Rule evidence, IP decisions, alerts, approvals and training records. Use a baseline of at least five years after relationship termination for customer records and five years after a transaction for transaction records, or longer where applicable law, contract or legal hold requires it.",
        "Apply the longest applicable retention requirement and document its legal basis. Protect records using least privilege access, encryption where appropriate, audit trails, backups and secure disposal after retention and legal holds expire. Ensure records can reconstruct transactions and are promptly available to lawful authorities and authorised partner audits.",
        "Before outsourcing, assess capability, permitted countries, privacy, security, reliability and sanctions coverage. Agree responsibilities, access to records, incident notice, audit rights, subcontracting and exit arrangements. Track outages and missed controls. Remain responsible for customer acceptance and retained obligations; no blanket reliance on Quidax or another provider is permitted."
      ]
    },
    {
      "id": "section-14",
      "heading": "14. Training testing and review",
      "paragraphs": [
        "Provide induction training before relevant work and mandatory refresher training at least annually, retaining attendance and assessment evidence. Tailor additional training to onboarding, monitoring, virtual assets, reporting, sanctions and geographic controls. The AMLO and relevant staff must understand current typologies and provider procedures.",
        "Independently test sample KYC and KYB files, UBO evidence, risk ratings, EDD, screening match handling, alerts, wallet screening, Travel Rule routes, IP exceptions and reporting timeliness at least annually. Report gaps to the Board, assign remediation owners and dates, and retest material findings. Do not describe an internal audit department or Board Audit Committee as existing without confirmation.",
        "Review this policy annually and on changes in law, products, providers, jurisdictions or material incidents. Keep version history and approval evidence. Exceptions require documented AMLO and management approval and must not override law, sanctions or binding partner restrictions."
      ]
    },
    {
      "id": "section-15",
      "heading": "15. Adoption and implementation record",
      "paragraphs": [
        "Approval status Approved by management instruction recorded on 8 October 2026. Effective date 1 September 2026. Next scheduled review 1 September 2027, or sooner following material change. AML legal adviser Chike Romanus Udeze. AMLO and deputy appointments and operational reporting contacts must be maintained in the governance register. No Board resolution reference or signature has been supplied or represented by this approval record."
      ]
    },
    {
      "id": "section-16",
      "heading": "16. Reference sources",
      "paragraphs": [
        "NFIU guidance https://nfiu.gov.ng/Faqs. SEC rules https://www.sec.gov.ng/our-mandate/regulation/rules-and-regulations/. Current applicability must be checked as part of implementation."
      ]
    },
    {
      "id": "appendix-a",
      "heading": "Appendix A: Customer risk assessment procedure",
      "paragraphs": [
        "This procedure establishes the internal minimum. Compliance must maintain the approved form and operating workflow. It applies to each individual and company and must be completed before transactional approval; it also applies at periodic review and after material triggers.",
        "Step 1 Establish the activity. Record customer type, services requested, countries of residence or incorporation and operation, occupation or business, intended funding sources, expected monthly transaction volume and value, intended beneficiaries and virtual asset counterparties. Compare the requested services with the approved legal and provider scope. A service outside permitted scope cannot proceed to ordinary risk acceptance.",
        "Step 2 Verify the evidence. Link identity and address evidence, Sumsub verification reference and outcome, corporate registry results, ownership diagram and UBO verification. Check that documents and outcomes concern the same customer. Record unresolved discrepancies and seek further evidence before approving the account.",
        "Step 3 Assess each risk factor. For identity, geography, business, ownership, screening and expected transaction activity, record ordinary, elevated or significant risk and the reason. A verified employee with ordinary domestic activity and clear source of funds may be lower risk. A company with higher value flows or several overseas counterparties may require medium or high risk review depending on evidence. Complexity alone is assessed in context; unexplained complexity requires escalation.",
        "Step 4 Apply overrides. An applicable sanctions prohibition, illegal purpose, identity failure or untraceable ownership prevents approval. PEP status, credible financial crime concerns or other significant risk requires high risk review and EDD. Do not average away a significant risk using otherwise ordinary factors.",
        "Step 5 Decide and document. Record the overall rating, rationale, controls, permitted services and limits, approval officer and next review date. Medium risk requires documented Compliance review; high risk requires AMLO review and senior management acceptance after EDD. Staff must not reduce a rating to avoid an approval requirement.",
        "Step 6 Maintain the rating. Refresh after changes in identity, country, ownership, business or behaviour. Monitoring alerts and new screening information feed into the assessment. Record the previous rating, reason for change and approving officer. Retain declined and restricted decisions as well as approved ones under the applicable schedule."
      ]
    },
    {
      "id": "appendix-b",
      "heading": "Appendix B: Onboarding and EDD review procedure",
      "paragraphs": [
        "The onboarding reviewer checks the customer file for completeness and consistent identity before requesting approval. A provider success status is part of the evidence and must be understood in terms of the checks actually configured. Document any manual work and decisions outside the provider workflow.",
        "For individuals, confirm identity information, document validity and applicant matching, address evidence where required, purpose of account, occupation, source of funds, expected activity and screening outcome. Confirm any additional Nigerian service specific requirements and ensure failed or expired checks do not leave unrestricted access.",
        "For companies, confirm registry existence and status, business and address, authority of signatories, ownership percentages and control arrangements, directors, identified UBOs and controlling persons. Verify the relevant natural persons through Sumsub and obtain documentary evidence connecting them to the company. The relationship must remain unapproved if an ownership tier or controlling person cannot be explained.",
        "For EDD, ask what additional evidence would resolve the particular risk. Source of funds describes the origin of money used for the transactions; source of wealth explains how the customer's broader assets were accumulated. Corroborate declarations with proportionate independent documents and compare them with expected transaction size. Check business rationale and intended counterparties, especially for complex structures or unusual overseas activity.",
        "The review record must state the trigger, evidence requested and received, credibility assessment, residual risk, recommended decision and proposed controls. Obtain AMLO and senior management approval before high risk activity. Record any conditions such as lower limits, restricted routes or review before each transfer. Approval must have a review date and an accountable owner.",
        "If a customer refuses to provide necessary evidence, provides contradictory information or attempts to circumvent controls, decline or restrict the affected service and escalate for suspicious activity assessment. Do not explain a decision in a way that tips off the customer about reporting or an investigation. Existing balances and pending instructions require lawful handling, rather than an automatic return to an unverified beneficiary.",
        "At periodic review, check changed documents, company status, ownership, screening results, transaction profile and outstanding conditions. Keep the old evidence and approval history so the assessment can be reconstructed. The reviewer must not mark a review complete while material conditions remain unresolved."
      ]
    },
    {
      "id": "appendix-c",
      "heading": "Appendix C: Alert review and escalation procedure",
      "paragraphs": [
        "This procedure governs the monitoring case workflow. Compliance must approve the monitoring scenarios, thresholds, review frequency and staffing before use. Real time controls prevent release where required; periodic monitoring detects patterns that individual transaction checks may miss. Record which approach applies to each scenario and route.",
        "When an alert is generated, create a case identifier with the customer, linked parties, affected transactions, rule or provider source, timestamps and any hold applied. Preserve relevant records and prioritise sanctions, terrorist financing, suspected account compromise and time sensitive pending transfers. Staff must escalate urgent cases immediately to the AMLO or deputy.",
        "The reviewer compares the activity with the customer's profile and previous transactions, identifies linked accounts and beneficiaries, considers screening and wallet information and checks whether limits or approval conditions were breached. Obtain proportionate additional evidence if appropriate, without revealing an investigation or reporting intention. Record the explanation and independently evaluate its credibility.",
        "Possible outcomes are a substantiated false positive, activity explained with evidence, continued restriction pending additional evidence, declined activity, revised customer risk or an internal suspicious activity report. Each outcome requires a reason, reviewer and timestamp. Higher risk release and any override require AMLO approval and the appropriate senior approval. A sanctions prohibition cannot be overridden.",
        "Where a provider has held or rejected a transfer, obtain the available reason and comply with its instructions. Do not retry through another route to defeat the control. A failed transfer may still be suspicious and must not be excluded from review because no value moved.",
        "The AMLO decides on regulatory reporting independently of the commercial value of the customer. Record the point at which reasons for suspicion were established and the applicable filing deadline, filing reference and acknowledgement. The absence of a provider report does not settle Apexlogic reporting obligations. Protect reporting material in a restricted case repository.",
        "Compliance tracks open cases, age, unresolved holds, repeated patterns, provider outages and overdue decisions. Escalate overdue urgent cases promptly and report material trends to management and the Board. Periodic quality review must sample closed cases, false positives, override decisions and missed alerts, then update scenarios and training where justified."
      ]
    },
    {
      "id": "appendix-d",
      "heading": "Appendix D: Transfer readiness and geographic control procedure",
      "paragraphs": [
        "Before a virtual asset route is enabled, record its service, country coverage, provider, supported assets and networks, counterparty types and legal clearance. Confirm the identity approval gate, sanctions and wallet screening, monitoring coverage and applicable Travel Rule process. An incomplete readiness review requires restriction of the route until the missing control is resolved.",
        "For a covered outgoing transfer, collect the required originator and beneficiary information, identify the counterparty VASP or self hosted wallet, verify the required information and screen the relevant parties and wallet. Use the approved secure channel for required information exchange and retain evidence of transmission or receipt as applicable. A wallet address format check must not be treated as ownership verification or analytics screening.",
        "For an incoming transfer, check required accompanying information, beneficiary identity, relevant wallet exposure and provider alerts. Missing or inconsistent information requires investigation and a documented decision to hold, reject or request correction under the applicable procedure. Obtain legal advice where already received assets cannot simply be reversed or returned safely.",
        "Before onboarding or releasing activity affected by a geographic restriction, compare declared residence and incorporation, verification evidence, IP results and the approved provider and legal country register. A mismatch requires review, and a prohibited location must not be accepted solely because the declared country is supported.",
        "Record unavailable geographic lookups as exceptions and apply the approved alternative verification or pause the affected action where the check is essential. Test restrictions through the API as well as the customer interface, including trusted proxy configuration, unavailable lookups and changes to country lists.",
        "When a screening, monitoring, Travel Rule or geographic provider fails, identify affected transactions and customers, restrict services where required and inform the AMLO and technical owner immediately. Record the failure period, fallback decision, approvals and recovery. On restoration, recheck affected activity, review whether anything bypassed a required control and assess reporting or partner notification obligations.",
        "Maintain readiness evidence and repeat the review after new assets, networks, providers, countries or significant system changes. Operational staff must receive the route instructions before launch. The Board adoption record must identify unresolved gaps and the controls or restrictions that prevent unsupported activity from being represented as compliant."
      ]
    }
  ]
};
