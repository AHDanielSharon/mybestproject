import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BookOpen, FileDown, Loader2 } from "lucide-react";
import React, { useState } from "react";
import { toast } from "sonner";

export default function ReportGeneratorPage() {
  const [projectTitle] = useState(
    "SOCIONET – A Global Social Media Web Platform",
  );
  const [authorName, setAuthorName] = useState("");
  const [collegeName, setCollegeName] = useState("");
  const [department, setDepartment] = useState(
    "Computer Science and Engineering",
  );
  const [isGenerating, setIsGenerating] = useState(false);

  const generateHTMLReport = () => {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${projectTitle}</title>
    <style>
        @page {
            margin: 1in;
            counter-increment: page;
        }
        body {
            font-family: 'Times New Roman', Times, serif;
            font-size: 12pt;
            line-height: 1.5;
            color: #000;
            max-width: 8.5in;
            margin: 0 auto;
            padding: 1in;
            background: white;
        }
        h1 {
            font-size: 16pt;
            font-weight: bold;
            text-align: center;
            margin: 40px 0 20px 0;
            page-break-before: always;
        }
        h2 {
            font-size: 14pt;
            font-weight: bold;
            margin: 30px 0 15px 0;
        }
        h3 {
            font-size: 12pt;
            font-weight: bold;
            margin: 20px 0 10px 0;
        }
        p {
            text-align: justify;
            margin: 10px 0;
        }
        .title-page {
            text-align: center;
            margin-top: 200px;
        }
        .title-page h1 {
            font-size: 18pt;
            margin: 20px 0;
        }
        .title-page p {
            text-align: center;
            margin: 10px 0;
        }
        .chapter-title {
            text-align: center;
            font-size: 16pt;
            font-weight: bold;
            margin: 60px 0 40px 0;
        }
        .figure {
            text-align: center;
            margin: 30px 0;
        }
        .figure-caption {
            font-style: italic;
            text-align: center;
            margin: 10px 0;
        }
        .figure img {
            max-width: 100%;
            height: auto;
            border: 1px solid #ccc;
        }
        .page-break {
            page-break-after: always;
        }
        ul {
            margin: 10px 0 10px 40px;
        }
        li {
            margin: 5px 0;
        }
        .note {
            background: #f0f0f0;
            padding: 15px;
            margin: 20px 0;
            border-left: 4px solid #333;
        }
    </style>
</head>
<body>
    <!-- Title Page -->
    <div class="title-page">
        <h1>${projectTitle.toUpperCase()}</h1>
        <p style="font-size: 14pt; margin: 40px 0;">PROJECT REPORT</p>
        <p>Author: ${authorName}</p>
        <p>Institution: ${collegeName}</p>
        <p>Department: ${department}</p>
        <p>Date: ${new Date().toLocaleDateString()}</p>
    </div>
    <div class="page-break"></div>

    <!-- CHAPTER 1: INTRODUCTION (Page 7) -->
    <div class="chapter-title">CHAPTER 1<br>INTRODUCTION</div>

    <h2>1.1 Purpose and Motivation</h2>
    <p>SOCIONET is a comprehensive social media web platform designed to address the evolving needs of modern digital communication and content sharing. The platform was conceived to provide users with a seamless, feature-rich environment for social interaction, multimedia content creation, and real-time communication. In an era where digital connectivity has become paramount, SOCIONET aims to bridge the gap between traditional social networking features and contemporary user expectations for privacy, security, and enhanced user experience.</p>
    <p>The motivation behind SOCIONET stems from the observation that existing social media platforms often compromise on either security, user experience, or feature completeness. SOCIONET leverages blockchain technology through the Internet Computer Protocol to ensure data integrity, user privacy, and decentralized content management. This approach provides users with greater control over their data while maintaining the rich feature set expected from modern social platforms.</p>

    <h2>1.2 Goals and Objectives</h2>
    <p>The primary goals of SOCIONET include:</p>
    <ul>
        <li>Providing a secure and decentralized social media platform utilizing Internet Identity for authentication, ensuring user privacy and data protection.</li>
        <li>Implementing comprehensive multimedia sharing capabilities including videos, images, and ephemeral stories with automatic expiration.</li>
        <li>Facilitating real-time communication through an integrated messaging system supporting text and multimedia attachments.</li>
        <li>Creating an engaging content discovery experience through reels, stories, and an explore feed.</li>
        <li>Implementing a robust notification system to keep users informed of social interactions and updates.</li>
    </ul>

    <h2>1.3 Scope of the Project</h2>
    <p>SOCIONET encompasses a wide range of social media functionalities organized into distinct modules. The platform includes user authentication and profile management, video and image content sharing, ephemeral stories with 24-hour expiration, a comprehensive messaging system with friend requests, real-time notifications, and an enhanced user interface featuring modern neon aesthetics. The project scope extends to both frontend and backend development, with the frontend built using React and TypeScript, and the backend implemented in Motoko on the Internet Computer blockchain.</p>

    <h2>1.4 Key Modules and Features</h2>
    <p><strong>Reels Module:</strong> The reels feature provides users with a TikTok-style vertical scrolling video experience. Users can upload short-form videos, interact through likes and dislikes, add comments, share content, and track view counts. The module includes download functionality and engagement statistics tracking.</p>
    <p><strong>Stories Module:</strong> Stories allow users to share ephemeral content that automatically expires after 24 hours. The module supports both image and video stories, provides a full-screen viewing experience with progress indicators, and includes automatic cleanup of expired content to optimize storage.</p>
    <p><strong>Messaging Module:</strong> The comprehensive messaging system enables direct communication between users with support for text messages and multimedia attachments including photos, videos, audio files, and documents. The module includes friend request functionality, chat thread management, and real-time message updates.</p>
    <p><strong>Notifications Module:</strong> An integrated notification system keeps users informed of friend requests, message events, and social interactions. The module features a notification badge with unread count, a notification panel with detailed information, and mark-as-read functionality.</p>
    <p><strong>Neon UI Theme:</strong> The platform features a modern, vibrant user interface with neon glowing effects, animated borders, gradient backgrounds, and smooth transitions. The aesthetic combines electric blues, cyans, magentas, purples, and pink gradients to create an engaging visual experience.</p>

    <div class="figure">
        <img src="/assets/generated/ui-mockup-neon.dim_1200x800.png" alt="UI Mockup" style="max-width: 600px;">
        <p class="figure-caption">Figure 1.1: SOCIONET User Interface with Neon Theme</p>
    </div>

    <div class="page-break"></div>

    <!-- CHAPTER 2: LITERATURE SURVEY (Page 11) -->
    <div class="chapter-title">CHAPTER 2<br>LITERATURE SURVEY</div>

    <h2>2.1 Existing Social Media Platforms</h2>
    <p>The social media landscape is dominated by several major platforms, each with distinct features and target audiences. Facebook, launched in 2004, pioneered the concept of comprehensive social networking with features including friend connections, news feeds, groups, and multimedia sharing. Instagram, acquired by Facebook in 2012, focused on visual content sharing with an emphasis on photos and short videos, later introducing Stories and Reels to compete with emerging platforms.</p>
    <p>Twitter (now X) established itself as a microblogging platform emphasizing real-time information sharing and public discourse. TikTok revolutionized short-form video content with its algorithm-driven feed and vertical scrolling interface, achieving massive global adoption particularly among younger demographics. Snapchat introduced the concept of ephemeral content with disappearing messages and stories, influencing the design of similar features across other platforms.</p>

    <div class="figure">
        <img src="/assets/generated/literature-timeline.dim_1200x600.png" alt="Literature Timeline" style="max-width: 600px;">
        <p class="figure-caption">Figure 2.1: Evolution Timeline of Social Media Platforms</p>
    </div>

    <h2>2.2 Limitations of Current Platforms</h2>
    <p>Despite their popularity, existing social media platforms face several significant limitations. Privacy concerns remain paramount, with centralized data storage making platforms vulnerable to data breaches and unauthorized access. Users have limited control over their personal information, and data monetization practices often occur without transparent user consent. Content moderation challenges persist, with platforms struggling to balance free expression with the need to prevent harmful content.</p>
    <p>Algorithm transparency is another critical issue, as users often lack understanding of how content is prioritized and displayed in their feeds. Platform lock-in effects make it difficult for users to migrate their data and connections to alternative services. Additionally, centralized platforms are susceptible to censorship, service outages, and single points of failure. The advertising-driven business model of most platforms can compromise user experience and privacy.</p>

    <h2>2.3 The Gap SOCIONET Fills</h2>
    <p>SOCIONET addresses these limitations through its decentralized architecture built on the Internet Computer blockchain. By utilizing Internet Identity for authentication, the platform ensures that users maintain control over their digital identities without relying on traditional username-password systems or centralized identity providers. The blockchain-based storage system provides enhanced security and data integrity, making unauthorized access and data tampering significantly more difficult.</p>
    <p>The platform combines the best features of existing social media services while addressing their shortcomings. From Instagram and TikTok, SOCIONET adopts visual content sharing and short-form video features, implementing them with enhanced privacy controls. From Snapchat, it incorporates ephemeral stories with automatic expiration, but with improved user control and storage efficiency. The messaging system rivals WhatsApp and Telegram in functionality while maintaining decentralized data storage.</p>
    <p>SOCIONET's notification system provides real-time updates without compromising user privacy, and the modern neon UI theme offers a fresh, engaging aesthetic that differentiates it from traditional social media interfaces. The platform's open architecture and blockchain foundation provide transparency and user empowerment that centralized platforms cannot match.</p>

    <div class="page-break"></div>

    <!-- CHAPTER 3: PESTAL ANALYSIS (Page 16) -->
    <div class="chapter-title">CHAPTER 3<br>PESTAL ANALYSIS</div>

    <h2>3.1 Political Factors</h2>
    <p>The political landscape surrounding social media platforms has become increasingly complex, with governments worldwide implementing regulations to address concerns about data privacy, content moderation, and platform accountability. SOCIONET's decentralized architecture positions it favorably in this environment, as blockchain-based systems inherently provide greater transparency and user control. However, the platform must navigate varying regulatory requirements across different jurisdictions, particularly regarding data localization, content liability, and user verification requirements. The use of Internet Identity for authentication aligns with emerging regulatory trends favoring privacy-preserving authentication methods while potentially complicating compliance with know-your-customer (KYC) requirements in certain regions.</p>

    <h2>3.2 Economic Factors</h2>
    <p>The economic viability of social media platforms depends on sustainable monetization strategies and operational efficiency. Traditional platforms rely heavily on advertising revenue, which often conflicts with user privacy and experience. SOCIONET's blockchain-based infrastructure presents both opportunities and challenges from an economic perspective. The decentralized nature of the Internet Computer can reduce infrastructure costs compared to traditional cloud hosting, particularly as the platform scales. However, initial development costs for blockchain-based applications are typically higher, and the platform must develop alternative monetization strategies that align with its privacy-focused approach. Potential revenue models include premium features, creator monetization tools, and transaction fees, all while maintaining the core platform's accessibility and user-centric design.</p>

    <h2>3.3 Social Factors</h2>
    <p>Social media usage patterns and user expectations continue to evolve rapidly, with increasing emphasis on privacy, authenticity, and meaningful connections. Users, particularly younger demographics, are becoming more aware of data privacy issues and seeking alternatives to traditional platforms. SOCIONET addresses these social trends by providing enhanced privacy controls and transparent data handling. The platform's features, including ephemeral stories and real-time messaging, align with contemporary communication preferences for immediate, visual, and interactive content. The modern neon UI theme appeals to users seeking fresh, engaging digital experiences. However, the platform must also address concerns about digital wellbeing, content authenticity, and the potential for echo chambers or misinformation, implementing features that promote healthy social interactions and diverse perspectives.</p>

    <h2>3.4 Technological Factors</h2>
    <p>SOCIONET leverages cutting-edge technologies to deliver its feature set while maintaining security and performance. The Internet Computer blockchain provides a robust foundation for decentralized application development, offering advantages in terms of data integrity, censorship resistance, and user sovereignty. The platform utilizes React and TypeScript for frontend development, ensuring a responsive and maintainable codebase. Motoko, the native language of the Internet Computer, powers the backend with strong type safety and efficient execution. The integration of Internet Identity represents a significant technological advancement in authentication, eliminating password-related vulnerabilities while providing seamless user experiences. Blob storage capabilities enable efficient handling of multimedia content, including large video files. However, the platform must continuously adapt to technological changes, including evolving web standards, mobile device capabilities, and emerging blockchain technologies.</p>

    <h2>3.5 Environmental Factors</h2>
    <p>Environmental sustainability has become an important consideration for technology platforms, particularly those utilizing blockchain technology. Traditional proof-of-work blockchains have faced criticism for their energy consumption. The Internet Computer employs a more energy-efficient consensus mechanism, reducing the environmental impact compared to earlier blockchain platforms. SOCIONET's automatic cleanup of expired stories and efficient blob storage management contribute to resource optimization. The platform's architecture minimizes redundant data storage and processing, further reducing its environmental footprint. As environmental concerns continue to influence technology adoption decisions, SOCIONET's relatively efficient blockchain foundation positions it favorably compared to both traditional centralized platforms with massive data centers and energy-intensive blockchain alternatives.</p>

    <h2>3.6 Legal Factors</h2>
    <p>The legal landscape for social media platforms encompasses data protection regulations, content liability laws, intellectual property rights, and platform governance requirements. SOCIONET must comply with major data protection frameworks including the European Union's General Data Protection Regulation (GDPR), California Consumer Privacy Act (CCPA), and similar regulations worldwide. The platform's decentralized architecture and privacy-preserving authentication align well with these regulations' principles of data minimization and user control. However, the platform must implement mechanisms for users to exercise their rights, including data access, correction, and deletion. Content liability presents ongoing legal challenges, requiring clear terms of service, content policies, and moderation mechanisms. Intellectual property considerations include respecting copyright in user-generated content and implementing appropriate reporting and takedown procedures. The platform must also address legal questions specific to blockchain-based systems, including smart contract enforceability and cross-border data transfer regulations.</p>

    <div class="figure">
        <img src="/assets/generated/pestal-analysis-template.dim_1024x768.png" alt="PESTAL Analysis" style="max-width: 550px;">
        <p class="figure-caption">Figure 3.1: PESTAL Analysis Framework for SOCIONET</p>
    </div>

    <div class="page-break"></div>

    <!-- CHAPTER 4: DESIGN ANALYSIS (Page 20) -->
    <div class="chapter-title">CHAPTER 4<br>DESIGN ANALYSIS</div>

    <h2>4.1 System Architecture Overview</h2>
    <p>SOCIONET employs a modern three-tier architecture consisting of the presentation layer (frontend), application layer (backend canister), and data layer (blockchain storage). The frontend is built using React with TypeScript, providing a responsive and type-safe user interface. The backend is implemented as a Motoko canister on the Internet Computer, handling business logic, data management, and access control. The blockchain serves as the persistent data layer, ensuring data integrity and availability. This architecture provides clear separation of concerns, enabling independent development and scaling of each layer while maintaining system cohesion.</p>

    <div class="figure">
        <img src="/assets/generated/architecture-diagram.dim_1024x768.png" alt="Architecture Diagram" style="max-width: 550px;">
        <p class="figure-caption">Figure 4.1: System Architecture Diagram</p>
    </div>

    <h2>4.2 Frontend-Backend Interaction</h2>
    <p>Communication between the frontend and backend occurs through the Internet Computer's agent-based architecture. The frontend initializes an actor that serves as a proxy to the backend canister, enabling type-safe method calls. Query calls are used for read-only operations, providing fast responses without consensus overhead. Update calls are employed for state-changing operations, ensuring data consistency through blockchain consensus. React Query manages the frontend's data fetching and caching strategy, providing optimistic updates and automatic refetching to maintain data freshness. The system implements proper error handling and loading states to ensure a smooth user experience even during network latency or temporary failures.</p>

    <div class="figure">
        <img src="/assets/generated/system-design-flowchart.dim_1024x768.png" alt="System Design Flowchart" style="max-width: 550px;">
        <p class="figure-caption">Figure 4.2: System Design Flowchart</p>
    </div>

    <h2>4.3 Authentication Flow</h2>
    <p>SOCIONET utilizes Internet Identity for user authentication, providing a secure and user-friendly authentication experience without traditional passwords. The authentication flow begins when a user initiates login, triggering the Internet Identity authentication popup. The user authenticates using their chosen method (biometrics, security key, or passphrase). Upon successful authentication, Internet Identity returns a delegated identity specific to SOCIONET. The frontend stores this identity and uses it to sign subsequent requests to the backend canister. The backend verifies the caller's identity on each request, ensuring that only authenticated users can access protected resources. The system implements role-based access control, with distinct permissions for guests, users, and administrators. Profile setup occurs automatically for first-time users, creating a seamless onboarding experience.</p>

    <h2>4.4 Data Structures and Storage</h2>
    <p>The backend employs efficient data structures to manage the platform's various entities. User profiles are stored in a Map structure keyed by Principal, enabling O(1) lookup performance. Videos and stories utilize similar Map structures with unique identifiers, supporting efficient retrieval and updates. Friend requests are stored with composite keys combining sender and recipient principals, facilitating quick status checks. Message threads use sorted keys to ensure consistent thread identification regardless of message direction. Reel statistics are maintained separately from video metadata, allowing independent updates and queries. The blob storage system handles large files efficiently, with the ExternalBlob class providing methods for both direct URL access and byte-level manipulation. Automatic cleanup mechanisms remove expired stories, maintaining storage efficiency. The system implements proper indexing strategies to support common query patterns, including user-specific content retrieval and search functionality.</p>

    <div class="page-break"></div>

    <!-- CHAPTER 5: REQUIREMENT ANALYSIS (Page 24) -->
    <div class="chapter-title">CHAPTER 5<br>REQUIREMENT ANALYSIS</div>

    <h2>5.1 Functional Requirements</h2>
    <p><strong>Authentication and User Management:</strong> The system shall provide Internet Identity integration for secure user authentication. Users shall be able to create and manage their profiles, including name, bio, and profile photo. The system shall support role-based access control with guest, user, and administrator roles.</p>
    <p><strong>Content Management:</strong> Users shall be able to upload videos with titles, descriptions, and optional thumbnails. The system shall support video files up to 500MB in size. Users shall be able to create ephemeral stories that automatically expire after 24 hours. The system shall support both image and video stories. Users shall be able to delete their own content.</p>
    <p><strong>Social Interactions:</strong> Users shall be able to send, accept, and reject friend requests. The system shall track friend request status (pending, accepted, rejected). Users shall be able to like, dislike, and comment on reels. The system shall track view counts for video content. Users shall be able to share reels and download content.</p>
    <p><strong>Messaging System:</strong> Users shall be able to send direct messages to any other user. The system shall support text messages and multimedia attachments (photos, videos, audio, PDFs, documents). Message threads shall be automatically created when users initiate conversations. The system shall display message history with timestamps.</p>
    <p><strong>Notifications:</strong> The system shall generate notifications for friend requests (sent, accepted, rejected). The system shall generate notifications for new messages. Users shall be able to view their notification history. Users shall be able to mark notifications as read. The system shall display an unread notification count.</p>
    <p><strong>Search and Discovery:</strong> Users shall be able to search for other users by name. Users shall be able to search for videos by title and description. The system shall provide an explore feed for content discovery. Users shall be able to view other users' profiles, including their videos and stories.</p>

    <h2>5.2 Non-Functional Requirements</h2>
    <p><strong>Performance:</strong> The system shall load the main feed within 3 seconds on standard broadband connections. Video playback shall begin within 2 seconds of user interaction. The system shall support concurrent access by multiple users without performance degradation. Query operations shall complete within 1 second under normal load conditions.</p>
    <p><strong>Security:</strong> All user authentication shall utilize Internet Identity's cryptographic protocols. The system shall verify caller identity on all protected backend operations. User data shall be stored on the blockchain with cryptographic integrity guarantees. The system shall implement proper access control to prevent unauthorized data access.</p>
    <p><strong>Usability:</strong> The user interface shall be intuitive and require minimal training. The system shall provide clear feedback for all user actions. Error messages shall be informative and guide users toward resolution. The interface shall be responsive and adapt to different screen sizes.</p>
    <p><strong>Reliability:</strong> The system shall maintain 99.9% uptime, leveraging the Internet Computer's infrastructure. Data shall be automatically replicated across blockchain nodes. The system shall implement automatic cleanup of expired content. Failed operations shall be handled gracefully with appropriate error recovery.</p>
    <p><strong>Scalability:</strong> The system architecture shall support horizontal scaling as user base grows. Blob storage shall efficiently handle increasing volumes of multimedia content. The database design shall support millions of users and content items. Query performance shall remain acceptable as data volume increases.</p>
    <p><strong>Maintainability:</strong> The codebase shall follow established coding standards and best practices. The system shall utilize TypeScript for type safety and code maintainability. Components shall be modular and reusable. The system shall include comprehensive error handling and logging.</p>

    <div class="figure">
        <img src="/assets/generated/requirements-matrix.dim_1024x768.png" alt="Requirements Matrix" style="max-width: 550px;">
        <p class="figure-caption">Figure 5.1: Requirements Mapping Matrix</p>
    </div>

    <h2>5.3 UI Design Requirements</h2>
    <p>The user interface shall implement a modern neon glowing theme with vibrant colors including electric blues, cyans, magentas, purples, and pink gradients. Interactive elements shall feature animated neon borders and glowing hover effects. The interface shall utilize smooth animations and transitions for page navigation and element appearances. Buttons and cards shall display subtle glowing effects on user interaction. The color scheme shall maintain sufficient contrast for accessibility while preserving the neon aesthetic. The design shall be consistent across all application sections, including feed, explore, reels, messages, and profile pages. The notification badge shall integrate seamlessly with the neon theme, featuring animated pulsing effects. All UI components shall be responsive and adapt gracefully to different screen sizes and orientations.</p>

    <h2>5.4 Storage Requirements</h2>
    <p>The system shall support video files up to 500MB in size for reels and regular video uploads. Story content shall support both images and videos with appropriate size limits. Message attachments shall support multiple file types including photos, videos, audio files, PDFs, and common document formats. The blob storage system shall provide efficient storage and retrieval of large files. The system shall implement automatic cleanup of expired stories to optimize storage utilization. Profile photos shall be stored with appropriate compression to balance quality and storage efficiency. The storage architecture shall leverage the Internet Computer's blob storage capabilities for scalability and performance.</p>

    <h2>5.5 Integration Requirements</h2>
    <p>The system shall integrate with Internet Identity for user authentication, supporting all authentication methods provided by the service. The frontend shall communicate with the backend canister through the Internet Computer agent, utilizing both query and update calls appropriately. The system shall integrate React Query for efficient data fetching, caching, and state management. The notification system shall integrate seamlessly with existing UI components without disrupting user workflows. The messaging system shall support blob storage integration for multimedia attachments. All integrations shall be implemented with proper error handling and fallback mechanisms to ensure system reliability.</p>

    <div class="page-break"></div>

    <!-- END OF REPORT -->
    <div style="text-align: center; margin-top: 100px;">
        <h1>END OF REPORT</h1>
    </div>

    <div class="note">
        <p><strong>Note:</strong> This report includes references to the following diagrams and assets from the project's assets folder:</p>
        <ul>
            <li>architecture-diagram.png: System architecture overview</li>
            <li>system-design-flowchart.png: Detailed system design flow</li>
            <li>ui-mockup-neon.png: User interface mockup with neon theme</li>
            <li>requirements-matrix.png: Requirements mapping matrix</li>
            <li>literature-timeline.png: Evolution timeline of social media platforms</li>
            <li>pestal-analysis-template.png: PESTAL analysis framework</li>
        </ul>
        <p>All screenshots and diagrams are available in the <code>frontend/assets/</code> directory.</p>
    </div>
</body>
</html>`;
  };

  const generateReport = async () => {
    if (!authorName.trim() || !collegeName.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsGenerating(true);
    toast.info("Generating report...");

    try {
      // Generate HTML report content
      const reportContent = generateHTMLReport();

      // Create a blob with the HTML content
      const blob = new Blob([reportContent], {
        type: "text/html;charset=utf-8",
      });

      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${projectTitle.replace(/[^a-z0-9]/gi, "_")}_Report.html`;

      // Trigger download
      document.body.appendChild(link);
      link.click();

      // Cleanup
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(
        "Report generated successfully! Open in browser and save as PDF or import to Word.",
      );
    } catch (error) {
      console.error("Error generating report:", error);
      toast.error("Failed to generate report. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <BookOpen className="w-10 h-10 text-cyan-400" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              College Project Report Generator
            </h1>
          </div>
          <p className="text-gray-300 text-lg">
            Generate a comprehensive academic report for SOCIONET with embedded
            assets
          </p>
        </div>

        <Card className="bg-slate-900/50 border-cyan-500/30 shadow-[0_0_30px_rgba(6,182,212,0.3)]">
          <CardHeader>
            <CardTitle className="text-2xl text-cyan-400">
              Report Configuration
            </CardTitle>
            <CardDescription className="text-gray-400">
              Enter your details to generate a professionally formatted HTML
              document with embedded diagrams
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="projectTitle" className="text-gray-300">
                Project Title
              </Label>
              <Input
                id="projectTitle"
                value={projectTitle}
                readOnly
                className="bg-slate-800/50 border-cyan-500/30 text-white focus:border-cyan-400 focus:ring-cyan-400/20"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="authorName" className="text-gray-300">
                Author Name <span className="text-red-400">*</span>
              </Label>
              <Input
                id="authorName"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                placeholder="Enter your name"
                className="bg-slate-800/50 border-cyan-500/30 text-white focus:border-cyan-400 focus:ring-cyan-400/20"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="collegeName" className="text-gray-300">
                College/University Name <span className="text-red-400">*</span>
              </Label>
              <Input
                id="collegeName"
                value={collegeName}
                onChange={(e) => setCollegeName(e.target.value)}
                placeholder="Enter your college name"
                className="bg-slate-800/50 border-cyan-500/30 text-white focus:border-cyan-400 focus:ring-cyan-400/20"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="department" className="text-gray-300">
                Department
              </Label>
              <Input
                id="department"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="e.g., Computer Science and Engineering"
                className="bg-slate-800/50 border-cyan-500/30 text-white focus:border-cyan-400 focus:ring-cyan-400/20"
              />
            </div>

            <div className="bg-slate-800/30 border border-purple-500/30 rounded-lg p-4 space-y-2">
              <h3 className="text-lg font-semibold text-purple-400">
                Report Contents
              </h3>
              <ul className="text-sm text-gray-300 space-y-1 list-disc list-inside">
                <li>
                  Chapter 1: Introduction (comprehensive overview with page 7
                  start)
                </li>
                <li>
                  Chapter 2: Literature Survey (existing platforms analysis)
                </li>
                <li>
                  Chapter 3: PESTAL Analysis (detailed environmental analysis)
                </li>
                <li>
                  Chapter 4: Design Analysis (architecture and system design
                  with embedded diagrams)
                </li>
                <li>
                  Chapter 5: Requirement Analysis (functional and non-functional
                  with requirements matrix)
                </li>
                <li>
                  Embedded images from assets folder (architecture, flowcharts,
                  UI mockups)
                </li>
                <li>
                  Professional academic formatting ready for print or PDF
                  conversion
                </li>
              </ul>
            </div>

            <Button
              onClick={generateReport}
              disabled={
                isGenerating || !authorName.trim() || !collegeName.trim()
              }
              className="w-full bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white font-semibold py-6 text-lg shadow-[0_0_20px_rgba(6,182,212,0.5)] hover:shadow-[0_0_30px_rgba(6,182,212,0.7)] transition-all duration-300"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Generating Report with Assets...
                </>
              ) : (
                <>
                  <FileDown className="mr-2 h-5 w-5" />
                  Generate HTML Report
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <div className="mt-6 text-center text-sm text-gray-400">
          <p>
            The report will be downloaded as an HTML document with embedded
            images
          </p>
          <p className="mt-2">
            Open in browser and use Print to PDF or import to Microsoft Word
          </p>
          <p className="mt-2 text-xs text-gray-500">
            Images are automatically referenced from the frontend/assets/
            directory
          </p>
        </div>
      </div>
    </div>
  );
}
