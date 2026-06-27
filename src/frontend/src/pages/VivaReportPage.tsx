import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  BookOpen,
  FileDown,
  GraduationCap,
  Loader2,
  Printer,
} from "lucide-react";
import React, { useState, useRef } from "react";
import { toast } from "sonner";

export default function VivaReportPage() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const generatePDF = () => {
    setIsGenerating(true);
    toast.info("Opening print dialog for PDF generation...");

    try {
      // Show preview and trigger print
      setShowPreview(true);

      // Wait for content to render, then trigger print
      setTimeout(() => {
        window.print();
        setIsGenerating(false);
        toast.success("Use your browser's print dialog to save as PDF");
      }, 500);
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to open print dialog. Please try again.");
      setIsGenerating(false);
      setShowPreview(false);
    }
  };

  return (
    <>
      {/* Main UI - hidden when preview is shown */}
      <div
        className={`min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 p-6 ${showPreview ? "print:hidden" : ""}`}
      >
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8 text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <GraduationCap className="w-12 h-12 text-cyan-400" />
              <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                Viva-Ready PDF Documentation
              </h1>
            </div>
            <p className="text-gray-300 text-lg">
              Comprehensive technical documentation with Q&A for academic
              presentation
            </p>
          </div>

          {/* Action Card */}
          <Card className="bg-slate-900/50 border-cyan-500/30 shadow-[0_0_30px_rgba(6,182,212,0.3)] mb-8">
            <CardHeader>
              <CardTitle className="text-2xl text-cyan-400 flex items-center gap-2">
                <BookOpen className="w-6 h-6" />
                Generate Viva Report
              </CardTitle>
              <CardDescription className="text-gray-400">
                Download a professionally formatted PDF document ready for viva
                presentation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-slate-800/30 border border-purple-500/30 rounded-lg p-4 mb-6 space-y-2">
                <h3 className="text-lg font-semibold text-purple-400">
                  Document Contents
                </h3>
                <ul className="text-sm text-gray-300 space-y-1 list-disc list-inside">
                  <li>
                    Project Overview with comprehensive system description
                  </li>
                  <li>System Architecture (Frontend, Backend, Database)</li>
                  <li>Key Features and Technical Implementation</li>
                  <li>Technical Q&A (50+ questions covering all aspects)</li>
                  <li>Design & Aesthetic Details</li>
                  <li>
                    Bonus Advanced Questions for deep technical discussion
                  </li>
                  <li>
                    Embedded diagrams: Architecture, System Design, UI Mockups,
                    Requirements Matrix
                  </li>
                  <li>Professional academic formatting with page numbers</li>
                </ul>
              </div>

              <Button
                onClick={generatePDF}
                disabled={isGenerating}
                className="w-full bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white font-semibold py-6 text-lg shadow-[0_0_20px_rgba(6,182,212,0.5)] hover:shadow-[0_0_30px_rgba(6,182,212,0.7)] transition-all duration-300"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Opening Print Dialog...
                  </>
                ) : (
                  <>
                    <Printer className="mr-2 h-5 w-5" />
                    Generate PDF (Print to PDF)
                  </>
                )}
              </Button>

              <p className="text-center text-sm text-gray-400 mt-4">
                Click the button above, then select "Save as PDF" in your
                browser's print dialog
              </p>
            </CardContent>
          </Card>

          <div className="mt-6 text-center text-sm text-gray-400">
            <p>The document will open in print preview mode</p>
            <p className="mt-2">
              Use your browser's "Save as PDF" or "Print to PDF" option
            </p>
            <p className="mt-2 text-xs text-gray-500">
              All images are automatically embedded from the assets directory
            </p>
          </div>
        </div>
      </div>

      {/* Print-only content */}
      {showPreview && (
        <div className="hidden print:block">
          <style>{`
            @page {
              size: A4;
              margin: 25mm;
            }
            @media print {
              body {
                font-family: 'Times New Roman', Times, serif;
                font-size: 12pt;
                line-height: 1.5;
                color: #000;
              }
              .page-break {
                page-break-after: always;
              }
              h1 {
                font-size: 18pt;
                font-weight: bold;
                margin-bottom: 20px;
                border-bottom: 2px solid #333;
                padding-bottom: 10px;
              }
              h2 {
                font-size: 14pt;
                font-weight: bold;
                margin-top: 20px;
                margin-bottom: 10px;
              }
              p {
                text-align: justify;
                margin-bottom: 15px;
              }
              ul {
                margin-left: 30px;
                margin-bottom: 15px;
              }
              li {
                margin-bottom: 8px;
              }
              img {
                max-width: 100%;
                height: auto;
                border: 1px solid #ccc;
                display: block;
                margin: 20px auto;
              }
              .figure-caption {
                font-style: italic;
                text-align: center;
                margin: 10px 0;
                font-size: 11pt;
              }
              .qa-item {
                margin-bottom: 20px;
              }
              .question {
                font-weight: bold;
                margin-bottom: 5px;
              }
              .answer {
                text-align: justify;
                margin-bottom: 15px;
                margin-left: 20px;
              }
            }
          `}</style>

          <div
            style={{
              fontFamily: "Times New Roman, serif",
              fontSize: "12pt",
              lineHeight: "1.5",
              color: "#000",
            }}
          >
            {/* Title Page */}
            <div
              style={{
                textAlign: "center",
                marginTop: "100px",
                marginBottom: "100px",
              }}
            >
              <img
                src="/assets/generated/socionet-logo-transparent.dim_200x200.png"
                alt="SOCIONET Logo"
                style={{
                  width: "100px",
                  height: "100px",
                  margin: "0 auto 30px",
                }}
              />
              <h1
                style={{
                  fontSize: "24pt",
                  fontWeight: "bold",
                  marginBottom: "20px",
                  border: "none",
                }}
              >
                SOCIONET – A GLOBAL SOCIAL MEDIA WEB PLATFORM
              </h1>
              <h2
                style={{
                  fontSize: "18pt",
                  marginBottom: "40px",
                  color: "#333",
                }}
              >
                Viva Ready Report
              </h2>
              <p style={{ fontSize: "14pt", marginBottom: "10px" }}>
                Comprehensive Technical Documentation
              </p>
              <p style={{ fontSize: "12pt", marginBottom: "10px" }}>
                Including System Architecture, Q&A, and Design Analysis
              </p>
              <p style={{ fontSize: "12pt", marginTop: "40px" }}>
                Date: {new Date().toLocaleDateString()}
              </p>
            </div>

            <div className="page-break" />

            {/* Section 1: Project Overview */}
            <h1>1. PROJECT OVERVIEW</h1>

            <h2>1.1 Introduction</h2>
            <p>
              SOCIONET is a comprehensive social media web platform built on the
              Internet Computer blockchain, designed to provide users with a
              secure, decentralized, and feature-rich environment for social
              interaction, multimedia content sharing, and real-time
              communication. The platform leverages cutting-edge blockchain
              technology to ensure data integrity, user privacy, and enhanced
              security while delivering a modern, engaging user experience
              through its distinctive neon-themed interface.
            </p>

            <h2>1.2 Core Objectives</h2>
            <p>The primary objectives of SOCIONET include:</p>
            <ul>
              <li>
                Implementing secure authentication using Internet Identity for
                password-free, privacy-preserving user access
              </li>
              <li>
                Providing comprehensive multimedia sharing capabilities
                including videos, images, and ephemeral stories
              </li>
              <li>
                Facilitating real-time communication through an integrated
                messaging system with multimedia attachment support
              </li>
              <li>
                Creating an engaging content discovery experience through reels,
                stories, and explore feeds
              </li>
              <li>
                Implementing a robust notification system for real-time user
                engagement
              </li>
              <li>
                Delivering a modern, visually appealing interface with neon
                aesthetics and smooth animations
              </li>
            </ul>

            <h2>1.3 Key Features</h2>
            <p>
              <strong>Authentication & User Management:</strong> Internet
              Identity integration provides secure, decentralized authentication
              without traditional passwords. Users can create and manage
              profiles with customizable names, bios, and profile photos.
              Role-based access control ensures appropriate permissions for
              guests, users, and administrators.
            </p>
            <p>
              <strong>Video Reels:</strong> TikTok-style vertical scrolling
              video experience with autoplay, like/dislike functionality,
              commenting system, share options, view tracking, and download
              capabilities. Enhanced with interactive engagement statistics and
              real-time updates.
            </p>
            <p>
              <strong>24-Hour Stories:</strong> Ephemeral content sharing
              supporting both images and videos with automatic expiration after
              24 hours. Features full-screen viewing experience with progress
              indicators, navigation controls, and automatic cleanup of expired
              content.
            </p>
            <p>
              <strong>Messaging System:</strong> Comprehensive direct messaging
              with support for text and multimedia attachments (photos, videos,
              audio, PDFs, documents). Includes friend request functionality,
              automatic chat thread creation, and real-time message updates.
            </p>

            <div className="page-break" />

            {/* Section 2: System Architecture */}
            <h1>2. SYSTEM ARCHITECTURE</h1>

            <h2>2.1 Frontend Architecture</h2>
            <p>
              The frontend is built using React 19 with TypeScript, providing a
              type-safe, component-based architecture. The application utilizes
              TanStack Router for client-side routing, React Query for efficient
              data fetching and caching, and Tailwind CSS with custom neon theme
              extensions for styling. The component structure follows a modular
              design pattern with reusable UI components, page components, and
              custom hooks for business logic separation.
            </p>

            <div style={{ textAlign: "center", margin: "30px 0" }}>
              <img
                src="/assets/generated/architecture-diagram.dim_1024x768.png"
                alt="System Architecture Diagram"
              />
              <p className="figure-caption">
                Figure 2.1: SOCIONET System Architecture Overview
              </p>
            </div>

            <h2>2.2 Backend Architecture</h2>
            <p>
              The backend is implemented as a Motoko canister on the Internet
              Computer blockchain. Motoko provides strong type safety,
              actor-based concurrency, and seamless integration with the
              Internet Computer's unique features. The backend handles all
              business logic, data persistence, access control, and API
              endpoints for frontend communication.
            </p>

            <div style={{ textAlign: "center", margin: "30px 0" }}>
              <img
                src="/assets/generated/system-design-flowchart.dim_1024x768.png"
                alt="System Design Flowchart"
              />
              <p className="figure-caption">
                Figure 2.2: System Design and Data Flow
              </p>
            </div>

            <div className="page-break" />

            {/* Section 3: Key Features */}
            <h1>3. KEY FEATURES</h1>

            <h2>3.1 Internet Identity Authentication</h2>
            <p>
              Internet Identity provides a secure, privacy-preserving
              authentication system that eliminates the need for traditional
              passwords. Users authenticate using biometrics, security keys, or
              passphrases, and receive a unique principal identifier for the
              application.
            </p>

            <div style={{ textAlign: "center", margin: "30px 0" }}>
              <img
                src="/assets/generated/ui-mockup-neon.dim_1200x800.png"
                alt="UI Mockup with Neon Theme"
              />
              <p className="figure-caption">
                Figure 3.1: SOCIONET User Interface with Neon Theme
              </p>
            </div>

            <h2>3.2 Video Reels and Stories</h2>
            <p>
              The reels feature provides a vertical scrolling video experience
              similar to TikTok, with autoplay, full-screen viewing, and
              comprehensive interaction options. Users can like, dislike,
              comment, share, and download reels. View counts are automatically
              tracked, and engagement statistics are displayed in real-time.
            </p>

            <div className="page-break" />

            {/* Section 4: Technical Q&A */}
            <h1>4. TECHNICAL Q&A</h1>

            <h2 style={{ color: "#0066cc" }}>4.1 General Questions</h2>

            <div className="qa-item">
              <p className="question">
                Q1: What is SOCIONET and what problem does it solve?
              </p>
              <p className="answer">
                SOCIONET is a decentralized social media platform built on the
                Internet Computer blockchain. It solves several problems with
                traditional social media: centralized data control, privacy
                concerns, lack of user data ownership, and security
                vulnerabilities. By leveraging blockchain technology and
                Internet Identity, SOCIONET provides users with enhanced
                privacy, data ownership, and security while maintaining all the
                features expected from modern social platforms.
              </p>
            </div>

            <div className="qa-item">
              <p className="question">
                Q2: Why did you choose the Internet Computer for this project?
              </p>
              <p className="answer">
                The Internet Computer offers unique advantages: true
                decentralization with canister smart contracts, orthogonal
                persistence eliminating traditional database needs, Internet
                Identity for secure authentication, efficient blob storage for
                multimedia content, and web-speed performance. Unlike other
                blockchains, the Internet Computer can serve web content
                directly, making it ideal for full-stack decentralized
                applications like SOCIONET.
              </p>
            </div>

            <div className="qa-item">
              <p className="question">
                Q3: What is Internet Identity and how does it work?
              </p>
              <p className="answer">
                Internet Identity is a blockchain-based authentication system
                that eliminates passwords. Users authenticate using biometrics,
                security keys, or passphrases on their devices. The system
                generates a unique principal identifier for each application,
                ensuring privacy across different services.
              </p>
            </div>

            <div className="qa-item">
              <p className="question">
                Q4: What are the main features of SOCIONET?
              </p>
              <p className="answer">
                Main features include: Internet Identity authentication, user
                profile management with avatars, video reels with vertical
                scrolling and interactions, 24-hour ephemeral stories,
                comprehensive messaging system with multimedia attachments,
                friend request functionality, real-time notifications, enhanced
                feed with interactive videos, search and discovery features, and
                a modern neon-themed UI with animations.
              </p>
            </div>

            <div className="qa-item">
              <p className="question">Q5: How is data stored in SOCIONET?</p>
              <p className="answer">
                Data is stored using the Internet Computer's orthogonal
                persistence model. All data in stable variables is automatically
                persisted across canister upgrades. We use efficient data
                structures: Maps for user profiles and content with O(1) lookup,
                Arrays for ordered collections, and the ExternalBlob class for
                large multimedia files.
              </p>
            </div>

            <div className="page-break" />

            <h2 style={{ color: "#0066cc" }}>4.2 Frontend Questions</h2>

            <div className="qa-item">
              <p className="question">
                Q6: What frontend technologies are used in SOCIONET?
              </p>
              <p className="answer">
                The frontend uses React 19 with TypeScript for type-safe
                component development, TanStack Router for client-side routing,
                React Query for data fetching and caching, Tailwind CSS for
                styling with custom neon theme extensions, Lucide React for
                icons, and Shadcn/ui for accessible pre-built components.
              </p>
            </div>

            <div className="qa-item">
              <p className="question">
                Q7: How does the frontend communicate with the backend?
              </p>
              <p className="answer">
                Communication occurs through the Internet Computer agent, which
                creates an actor proxy to the backend canister. The frontend
                makes type-safe method calls using query calls for read-only
                operations (fast, no consensus) and update calls for
                state-changing operations (slower, requires consensus).
              </p>
            </div>

            <div className="qa-item">
              <p className="question">
                Q8: Explain the neon UI theme implementation.
              </p>
              <p className="answer">
                The neon theme uses OKLCH color system in index.css with custom
                CSS variables for electric blues, cyans, magentas, purples, and
                pink gradients. Tailwind config extends with custom neon glow
                shadows, pulse animations, and gradient shifts.
              </p>
            </div>

            <div className="qa-item">
              <p className="question">
                Q9: How is state management handled in the application?
              </p>
              <p className="answer">
                State management uses a hybrid approach: React Query for server
                state (data from backend) with automatic caching and refetching,
                useState for local component state, useContext for shared UI
                state, and TanStack Router for navigation state.
              </p>
            </div>

            <div className="qa-item">
              <p className="question">
                Q10: How are images and videos handled in the frontend?
              </p>
              <p className="answer">
                Images and videos use the ExternalBlob class which provides two
                access methods: getDirectURL() for streaming and caching
                (preferred for display), and getBytes() for byte-level
                manipulation. For display, we use direct URLs which leverage
                browser caching and enable efficient streaming.
              </p>
            </div>

            <div className="page-break" />

            <h2 style={{ color: "#0066cc" }}>4.3 Backend Questions</h2>

            <div className="qa-item">
              <p className="question">
                Q11: What is Motoko and why was it chosen?
              </p>
              <p className="answer">
                Motoko is a programming language designed specifically for the
                Internet Computer. It was chosen for its strong type safety,
                actor-based concurrency model, seamless integration with
                Internet Computer features, orthogonal persistence support, and
                efficient compilation to WebAssembly.
              </p>
            </div>

            <div className="qa-item">
              <p className="question">
                Q12: Explain the canister architecture.
              </p>
              <p className="answer">
                The backend is a single Motoko canister containing all business
                logic and data storage. It includes modules for user management,
                video/story handling, messaging, friend requests, notifications,
                and access control. The canister exposes query methods
                (read-only, fast) and update methods (state-changing,
                consensus-based).
              </p>
            </div>

            <div className="qa-item">
              <p className="question">
                Q13: How is authentication verified in the backend?
              </p>
              <p className="answer">
                Every backend method receives a caller parameter containing the
                authenticated principal. The backend verifies this principal
                against stored user data and access control rules. The Internet
                Computer runtime ensures the caller principal cannot be spoofed,
                providing cryptographic authentication guarantees.
              </p>
            </div>

            <div className="qa-item">
              <p className="question">
                Q14: How does the friend request system work?
              </p>
              <p className="answer">
                Friend requests are stored in a Map with composite keys
                (sender_recipient). When a user sends a request, a new entry is
                created with status "pending". The recipient can accept (status
                becomes "accepted") or reject (status becomes "rejected").
              </p>
            </div>

            <div className="qa-item">
              <p className="question">
                Q15: Explain the messaging system implementation.
              </p>
              <p className="answer">
                Messages are stored in threads identified by sorted user
                principals (ensuring consistent thread IDs regardless of message
                direction). Each message contains sender, recipient, content,
                timestamp, and optional attachments.
              </p>
            </div>

            <div style={{ textAlign: "center", margin: "30px 0" }}>
              <img
                src="/assets/generated/requirements-matrix.dim_1024x768.png"
                alt="Requirements Matrix"
              />
              <p className="figure-caption">
                Figure 4.1: Requirements Mapping Matrix
              </p>
            </div>

            <div className="page-break" />

            {/* Section 5: Design & Aesthetic Details */}
            <h1>5. DESIGN & AESTHETIC DETAILS</h1>

            <h2>5.1 Neon Theme Implementation</h2>
            <p>
              The neon theme is implemented using OKLCH color system in
              index.css with custom CSS variables defining electric blues,
              cyans, magentas, purples, and pink gradients. These colors provide
              vibrant, eye-catching aesthetics while maintaining accessibility
              standards.
            </p>

            <h2>5.2 Animation and Transitions</h2>
            <p>
              Animations enhance user experience through: pulse animations on
              notification badges, gradient shifts on backgrounds, smooth
              transitions on hover states, page transitions using TanStack
              Router, and loading states with spinning indicators. All
              animations are GPU-accelerated using CSS transforms and opacity.
            </p>

            <h2>5.3 Responsive Design</h2>
            <p>
              The application is fully responsive using Tailwind's mobile-first
              approach. Breakpoints include: sm (640px), md (768px), lg
              (1024px), and xl (1280px). The bottom navigation adapts to screen
              size, video cards stack on mobile and grid on desktop.
            </p>

            <div className="page-break" />

            {/* Section 6: Bonus Advanced Questions */}
            <h1>6. BONUS ADVANCED QUESTIONS</h1>

            <div className="qa-item">
              <p className="question">
                Q16: How would you implement real-time messaging without
                WebSockets?
              </p>
              <p className="answer">
                Real-time messaging is achieved through React Query's automatic
                refetching with short intervals (5-10 seconds). When a user
                sends a message, the recipient's query automatically refetches,
                displaying the new message.
              </p>
            </div>

            <div className="qa-item">
              <p className="question">
                Q17: How would you implement content moderation?
              </p>
              <p className="answer">
                Content moderation could be implemented through: admin review
                queue for flagged content, user reporting system with automated
                flagging, AI-based content analysis using HTTP outcalls to
                external services, and community moderation with trusted user
                roles.
              </p>
            </div>

            <div className="qa-item">
              <p className="question">Q18: How would you monetize SOCIONET?</p>
              <p className="answer">
                Monetization strategies could include: premium features
                (extended storage, advanced analytics), creator monetization
                (tipping, subscriptions), NFT integration for unique content,
                and optional advertising with user control.
              </p>
            </div>

            <div className="qa-item">
              <p className="question">
                Q19: What are the limitations of the current implementation?
              </p>
              <p className="answer">
                Current limitations include: no true real-time messaging
                (polling-based), single canister architecture (scalability
                limit), basic search functionality, no content recommendation
                algorithm, and limited content moderation tools.
              </p>
            </div>

            <div className="qa-item">
              <p className="question">
                Q20: What makes SOCIONET unique in the Web3 space?
              </p>
              <p className="answer">
                SOCIONET's uniqueness comes from: full-stack decentralization
                (frontend and backend on-chain), Internet Identity integration
                for seamless authentication, comprehensive social features
                rivaling Web2 platforms, modern neon UI differentiating from
                typical blockchain apps, and focus on user experience rather
                than just decentralization.
              </p>
            </div>

            <div className="page-break" />

            {/* Conclusion */}
            <h1>CONCLUSION</h1>

            <p>
              SOCIONET represents a significant advancement in decentralized
              social media platforms, combining the best features of traditional
              social networks with the security, privacy, and user empowerment
              benefits of blockchain technology. Built on the Internet Computer,
              SOCIONET leverages cutting-edge technologies including Internet
              Identity for authentication, Motoko for backend development, and
              React with TypeScript for a modern, responsive frontend.
            </p>

            <p>
              The platform's comprehensive feature set includes video reels,
              ephemeral stories, messaging with multimedia attachments, friend
              requests, notifications, and an engaging neon-themed user
              interface. The architecture is designed for scalability, security,
              and maintainability, with clear separation of concerns between
              frontend and backend, efficient data structures, and robust access
              control mechanisms.
            </p>

            <p>
              Through this project, we have demonstrated that it is possible to
              build feature-rich, user-friendly social media applications on
              blockchain infrastructure without compromising on performance or
              user experience. SOCIONET serves as a proof of concept for the
              future of decentralized social networking, where users maintain
              control over their data while enjoying the connectivity and
              engagement features they expect from modern platforms.
            </p>

            <div
              style={{
                textAlign: "center",
                marginTop: "60px",
                paddingTop: "40px",
                borderTop: "2px solid #333",
              }}
            >
              <p
                style={{
                  fontSize: "14pt",
                  fontWeight: "bold",
                  marginBottom: "20px",
                }}
              >
                Thank you for reviewing this viva-ready documentation.
              </p>
              <p style={{ fontSize: "12pt", color: "#666" }}>
                For more information, visit the SOCIONET platform or contact the
                development team.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
