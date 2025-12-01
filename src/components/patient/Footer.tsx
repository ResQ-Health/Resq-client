const Footer = () => {
    return (
        <footer className="bg-[#0F1C26] w-full text-white">
            {/* Top Section - Main Content */}
            <div className="w-full max-w-7xl mx-auto px-4 sm:px-8 lg:px-16 py-12">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-[21px]">
                    {/* Left Half - Branding and Social Media */}
                    <div className="space-y-6">
                        {/* Logo Section - Placeholder for logo */}
                        <div className="flex items-center space-x-2">
                            <div className="w-8 h-8 bg-white rounded flex items-center justify-center">
                                {/* Logo placeholder - replace with actual logo */}
                                <svg className="w-5 h-5 text-[#0F1C26]" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                                </svg>
                            </div>
                            <span className="text-xl font-bold">RESQ</span>
                        </div>

                        {/* Tagline */}
                        <div className="space-y-1">
                            <p className="text-lg">Your Diagnostic Journey Begins</p>
                            <p className="text-lg">with One Search</p>
                        </div>

                        {/* Social Media Icons */}
                        <div className="flex space-x-4">
                            {/* X (Twitter) */}
                            <a href="#" className="hover:opacity-80 transition-opacity">
                                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                                </svg>
                            </a>

                            {/* LinkedIn */}
                            <a href="#" className="hover:opacity-80 transition-opacity">
                                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                                </svg>
                            </a>

                            {/* Instagram */}
                            <a href="#" className="hover:opacity-80 transition-opacity">
                                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 6.62 5.367 11.987 11.988 11.987 6.62 0 11.987-5.367 11.987-11.987C24.014 5.367 18.637.001 12.017.001zM8.449 16.988c-1.297 0-2.448-.49-3.323-1.297C4.198 14.895 3.708 13.744 3.708 12.447s.49-2.448 1.297-3.323c.875-.807 2.026-1.297 3.323-1.297s2.448.49 3.323 1.297c.807.875 1.297 2.026 1.297 3.323s-.49 2.448-1.297 3.323c-.875.807-2.026 1.297-3.323 1.297zm7.718-1.297c-.875.807-2.026 1.297-3.323 1.297s-2.448-.49-3.323-1.297c-.807-.875-1.297-2.026-1.297-3.323s.49-2.448 1.297-3.323c.875-.807 2.026-1.297 3.323-1.297s2.448.49 3.323 1.297c.807.875 1.297 2.026 1.297 3.323s-.49 2.448-1.297 3.323z" />
                                </svg>
                            </a>

                            {/* Medium */}
                            <a href="#" className="hover:opacity-80 transition-opacity">
                                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M13.54 12a6.8 6.8 0 01-6.77 6.82A6.8 6.8 0 010 12a6.8 6.8 0 016.77-6.82A6.8 6.8 0 0113.54 12zM20.96 12c0 3.54-1.51 6.42-3.38 6.42-1.87 0-3.39-2.88-3.39-6.42s1.52-6.42 3.39-6.42 3.38 2.88 3.38 6.42M24 12c0 3.17-.53 5.75-1.19 5.75-.66 0-1.19-2.58-1.19-5.75s.53-5.75 1.19-5.75C23.47 6.25 24 8.83 24 12z" />
                                </svg>
                            </a>
                        </div>
                    </div>

                    {/* Right Half - Navigation Links */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                        {/* Services */}
                        <div className="space-y-3">
                            <h3 className="font-bold text-lg">Services</h3>
                            <ul className="space-y-2 text-[16px] font-[400] ">
                                <li><a href="#" className="hover:opacity-80 transition-opacity">CT Scan</a></li>
                                <li><a href="#" className="hover:opacity-80 transition-opacity">MRI</a></li>
                                <li><a href="#" className="hover:opacity-80 transition-opacity">Mammogram</a></li>
                                <li><a href="#" className="hover:opacity-80 transition-opacity">X-Ray</a></li>
                                <li><a href="#" className="hover:opacity-80 transition-opacity">Consultation</a></li>
                            </ul>
                        </div>

                        {/* About Us */}
                        <div className="space-y-3">
                            <h3 className="font-bold text-lg">About Us</h3>
                            <ul className="space-y-2">
                                <li><a href="#" className="hover:opacity-80 transition-opacity">FAQ</a></li>
                                <li><a href="#" className="hover:opacity-80 transition-opacity">ResQ Story</a></li>
                                <li><a href="#" className="hover:opacity-80 transition-opacity">Partners</a></li>
                            </ul>
                        </div>

                        {/* Business */}
                        <div className="space-y-3">
                            <h3 className="font-bold text-lg">Business</h3>
                            <ul className="space-y-2">
                                <li><a href="#" className="hover:opacity-80 transition-opacity">Specialists</a></li>
                                <li><a href="#" className="hover:opacity-80 transition-opacity">Hospitals</a></li>
                                <li><a href="#" className="hover:opacity-80 transition-opacity">Imaging Centers</a></li>
                                <li><a href="#" className="hover:opacity-80 transition-opacity">Referring Partners</a></li>
                            </ul>
                        </div>

                        {/* Contact */}
                        <div className="space-y-3">
                            <h3 className="font-bold text-lg">Contact</h3>
                            <ul className="space-y-2">
                                <li><a href="mailto:Hello@resqhealthafrica.com" className="hover:opacity-80 transition-opacity">Hello@resqhealthafrica.com</a></li>
                                <li><a href="tel:+234707277983" className="hover:opacity-80 transition-opacity">+234707277983</a></li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Section - Legal Links */}
            <div className="border-t border-white/20 w-full">
                <div className="w-full max-w-7xl mx-auto px-4 sm:px-8 lg:px-16 py-6">
                    <div className="flex justify-end">
                        <div className="flex space-x-6 text-sm">
                            <a href="#" className="hover:opacity-80 transition-opacity">Privacy Policy</a>
                            <span className="text-white/50">|</span>
                            <a href="#" className="hover:opacity-80 transition-opacity">Terms of Service</a>
                            <span className="text-white/50">|</span>
                            <a href="#" className="hover:opacity-80 transition-opacity">Cookie Policy</a>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    )
}

export default Footer