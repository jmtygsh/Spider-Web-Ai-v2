
import React from 'react'

import Link from 'next/link'

export const Footer = () => {
    return (
        < footer className="border-border/50 bg-background border-t py-12" >
            <div className="container mx-auto px-4">
                <div className="grid grid-cols-1 gap-8 md:grid-cols-4 lg:grid-cols-5">
                    <div className="md:col-span-2">
                        <Link href="/" className="mb-4 flex items-center gap-2">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                <circle cx="12" cy="12" r="2" fill="#ec4899" />
                                <line
                                    x1="12"
                                    y1="3"
                                    x2="12"
                                    y2="21"
                                    stroke="#ec4899"
                                    strokeWidth="1.5"
                                />
                                <line
                                    x1="3"
                                    y1="12"
                                    x2="21"
                                    y2="12"
                                    stroke="currentColor"
                                    strokeWidth="1.5"
                                />
                                <line
                                    x1="5"
                                    y1="5"
                                    x2="19"
                                    y2="19"
                                    stroke="currentColor"
                                    strokeWidth="1.5"
                                />
                            </svg>
                            <span className="text-xl font-bold tracking-tight">
                                Spider Web
                            </span>
                        </Link>
                        <p className="text-muted-foreground max-w-xs text-sm">
                            The intelligent assistant that manages your email and meetings
                            so you can focus on what matters.
                        </p>
                    </div>

                    <div>
                        <h4 className="text-foreground mb-4 font-semibold">Product</h4>
                        <ul className="text-muted-foreground space-y-3 text-sm">
                            <li>
                                <Link
                                    href="/features"
                                    className="hover:text-foreground transition-colors"
                                >
                                    Features
                                </Link>
                            </li>
                            <li>
                                <Link
                                    href="/pricing"
                                    className="hover:text-foreground transition-colors"
                                >
                                    Pricing
                                </Link>
                            </li>
                            <li>
                                <Link
                                    href="/security"
                                    className="hover:text-foreground transition-colors"
                                >
                                    Security
                                </Link>
                            </li>
                            <li>
                                <Link
                                    href="/changelog"
                                    className="hover:text-foreground transition-colors"
                                >
                                    Changelog
                                </Link>
                            </li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="text-foreground mb-4 font-semibold">Company</h4>
                        <ul className="text-muted-foreground space-y-3 text-sm">
                            <li>
                                <Link
                                    href="/about"
                                    className="hover:text-foreground transition-colors"
                                >
                                    About
                                </Link>
                            </li>
                            <li>
                                <Link
                                    href="/blog"
                                    className="hover:text-foreground transition-colors"
                                >
                                    Blog
                                </Link>
                            </li>
                            <li>
                                <Link
                                    href="/careers"
                                    className="hover:text-foreground transition-colors"
                                >
                                    Careers
                                </Link>
                            </li>
                            <li>
                                <Link
                                    href="/contact"
                                    className="hover:text-foreground transition-colors"
                                >
                                    Contact
                                </Link>
                            </li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="text-foreground mb-4 font-semibold">Legal</h4>
                        <ul className="text-muted-foreground space-y-3 text-sm">
                            <li>
                                <Link
                                    href="/privacy"
                                    className="hover:text-foreground transition-colors"
                                >
                                    Privacy Policy
                                </Link>
                            </li>
                            <li>
                                <Link
                                    href="/terms"
                                    className="hover:text-foreground transition-colors"
                                >
                                    Terms of Service
                                </Link>
                            </li>
                            <li>
                                <Link
                                    href="/cookies"
                                    className="hover:text-foreground transition-colors"
                                >
                                    Cookie Policy
                                </Link>
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="border-border/50 mt-12 flex flex-col items-center justify-between gap-4 border-t pt-8 md:flex-row">
                    <p className="text-muted-foreground text-sm">
                        © {new Date().getFullYear()} Spider Web. All rights reserved.
                    </p>
                    <div className="flex items-center gap-4">
                        <Link
                            href="https://twitter.com"
                            className="text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <span className="sr-only">Twitter</span>
                            <svg
                                className="h-5 w-5"
                                fill="currentColor"
                                viewBox="0 0 24 24"
                                aria-hidden="true"
                            >
                                <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                            </svg>
                        </Link>
                        <Link
                            href="https://github.com"
                            className="text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <span className="sr-only">GitHub</span>
                            <svg
                                className="h-5 w-5"
                                fill="currentColor"
                                viewBox="0 0 24 24"
                                aria-hidden="true"
                            >
                                <path
                                    fillRule="evenodd"
                                    d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                                    clipRule="evenodd"
                                />
                            </svg>
                        </Link>
                    </div>
                </div>
            </div>
        </footer >
    )
}
