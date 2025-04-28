import Link from 'next/link';

export default function AboutPage() {
  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="w-full py-4 px-4 sm:px-6 lg:px-8 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
                <span className="text-white font-bold text-sm">N</span>
              </div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">NeuroNest-AI</h1>
            </Link>
          </div>
          <nav className="hidden md:flex space-x-8">
            <Link href="/" className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400">
              Home
            </Link>
            <Link href="/chat" className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400">
              Chat
            </Link>
            <Link href="/projects" className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400">
              Projects
            </Link>
            <Link href="/about" className="text-blue-600 dark:text-blue-400 font-medium">
              About
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">About NeuroNest-AI</h1>
          
          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">Our Vision</h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              NeuroNest-AI is a comprehensive platform designed to transform ideas into functional projects through the power of specialized AI agents. Our vision is to create a system where users can input their ideas through text, voice, or files, and have intelligent agents convert these ideas into fully functional, executable code and projects.
            </p>
            <p className="text-gray-700 dark:text-gray-300">
              We believe that technology should empower creativity, not hinder it. By automating the technical implementation details, we allow creators, entrepreneurs, and developers to focus on what matters most: their ideas and vision.
            </p>
          </section>
          
          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">How It Works</h2>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
              <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-4">Our Agent System</h3>
              <ul className="space-y-4">
                <li className="flex">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mr-3">
                    <span className="text-blue-600 dark:text-blue-400 font-semibold">1</span>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">Thinking Agent</h4>
                    <p className="text-gray-600 dark:text-gray-300">Analyzes your request, breaks it down into components, and creates a structured plan for implementation.</p>
                  </div>
                </li>
                <li className="flex">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mr-3">
                    <span className="text-blue-600 dark:text-blue-400 font-semibold">2</span>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">Developer Agent</h4>
                    <p className="text-gray-600 dark:text-gray-300">Takes the plan and generates clean, functional code across various programming languages and frameworks.</p>
                  </div>
                </li>
                <li className="flex">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mr-3">
                    <span className="text-blue-600 dark:text-blue-400 font-semibold">3</span>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">Editor Agent</h4>
                    <p className="text-gray-600 dark:text-gray-300">Reviews and refines the generated code, ensuring quality, performance, and adherence to best practices.</p>
                  </div>
                </li>
                <li className="flex">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mr-3">
                    <span className="text-blue-600 dark:text-blue-400 font-semibold">4</span>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">Execution Agent</h4>
                    <p className="text-gray-600 dark:text-gray-300">Prepares the execution environment, manages dependencies, and runs the generated code in a secure sandbox.</p>
                  </div>
                </li>
              </ul>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-4">Technical Stack</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">Frontend</h4>
                  <ul className="list-disc list-inside text-gray-600 dark:text-gray-300">
                    <li>React.js with Next.js</li>
                    <li>TailwindCSS for styling</li>
                    <li>Socket.io for real-time communication</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">Backend</h4>
                  <ul className="list-disc list-inside text-gray-600 dark:text-gray-300">
                    <li>Node.js with Express</li>
                    <li>Python for AI agent processing</li>
                    <li>MongoDB for data storage</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">AI Integration</h4>
                  <ul className="list-disc list-inside text-gray-600 dark:text-gray-300">
                    <li>Gemini API for agent intelligence</li>
                    <li>Custom prompt engineering</li>
                    <li>Vector database for context management</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">Execution Environment</h4>
                  <ul className="list-disc list-inside text-gray-600 dark:text-gray-300">
                    <li>Docker for containerization</li>
                    <li>Multi-language runtime support</li>
                    <li>Secure sandbox for code execution</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>
          
          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">Future Roadmap</h2>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <ul className="space-y-4">
                <li className="flex">
                  <div className="flex-shrink-0 w-8 h-8 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center mr-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">Multi-language Support</h4>
                    <p className="text-gray-600 dark:text-gray-300">Expanding beyond web development to support Python, Java, Kotlin (Android), Swift (iOS), and more.</p>
                  </div>
                </li>
                <li className="flex">
                  <div className="flex-shrink-0 w-8 h-8 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center mr-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">Advanced Dependency Management</h4>
                    <p className="text-gray-600 dark:text-gray-300">Automatic detection and installation of required libraries and frameworks for any project type.</p>
                  </div>
                </li>
                <li className="flex">
                  <div className="flex-shrink-0 w-8 h-8 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center mr-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">Enhanced Agent Orchestration</h4>
                    <p className="text-gray-600 dark:text-gray-300">More sophisticated coordination between agents with shared memory and context awareness.</p>
                  </div>
                </li>
                <li className="flex">
                  <div className="flex-shrink-0 w-8 h-8 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center mr-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">Cloud Integration</h4>
                    <p className="text-gray-600 dark:text-gray-300">Seamless deployment options to popular cloud platforms and hosting services.</p>
                  </div>
                </li>
                <li className="flex">
                  <div className="flex-shrink-0 w-8 h-8 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center mr-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">Custom Agent Creation</h4>
                    <p className="text-gray-600 dark:text-gray-300">Allowing users to create and customize their own specialized agents for specific tasks.</p>
                  </div>
                </li>
              </ul>
            </div>
          </section>
          
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">Get Started</h2>
            <p className="text-gray-700 dark:text-gray-300 mb-6">
              Ready to transform your ideas into reality? Start a conversation with our intelligent agents today and see your vision come to life.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/chat" className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                Start Creating
              </Link>
              <Link href="/projects" className="inline-flex items-center justify-center px-6 py-3 border border-gray-300 dark:border-gray-600 text-base font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                View Projects
              </Link>
            </div>
          </section>
        </div>
      </main>
      
      {/* Footer */}
      <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 py-6 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-gray-600 dark:text-gray-300">
            &copy; {new Date().getFullYear()} NeuroNest-AI. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}