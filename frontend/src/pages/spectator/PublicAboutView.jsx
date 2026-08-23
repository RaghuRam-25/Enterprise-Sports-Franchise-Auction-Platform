import 'react';
import { Info, Building, Users, Trophy, Mail, MapPin, Phone, ExternalLink } from 'lucide-react';
import Navbar from '../../components/Navbar';

export default function PublicAboutView() {
    return (
        <div className="min-h-screen flex flex-col bg-darkBg text-primaryText">
            <Navbar />

            <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
                {/* Header */}
                <div className="text-center">
                    <Building className="w-12 h-12 mx-auto text-white bg-neonGreen/10 p-3 rounded-2xl border border-neonGreen/20" />
                    <h1 className="text-3xl font-black font-heading text-white mt-4">About Our Organization</h1>
                    <p className="text-sm text-secondaryText mt-1">Dedicated to fostering sports talent and competitive spirit.</p>
                </div>

                <div className="glass-card rounded-2xl p-6 border border-cardBorder space-y-6">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Info className="w-5 h-5 text-white" /> Our Mission
                    </h2>
                    <p className="text-secondaryText leading-relaxed">
                        Our organization is committed to revolutionizing the way sports talent is discovered, nurtured, and celebrated.
                        Through our innovative franchise auction platform, we aim to create a fair and transparent ecosystem
                        where aspiring athletes can connect with professional teams, and teams can build formidable rosters.
                        We believe in the power of sports to unite communities and inspire excellence.
                    </p>

                    <h2 className="text-xl font-bold text-white flex items-center gap-2 pt-4 border-t border-cardBorder">
                        <Trophy className="w-5 h-5 text-warningGold" /> Our Vision
                    </h2>
                    <p className="text-secondaryText leading-relaxed">
                        To be the leading platform for sports talent acquisition and management, setting new standards for fairness,
                        efficiency, and excitement in the world of professional sports. We envision a future where every talented
                        individual has the opportunity to shine, and every team has the tools to achieve greatness.
                    </p>

                    <h2 className="text-xl font-bold text-white flex items-center gap-2 pt-4 border-t border-cardBorder">
                        <Users className="w-5 h-5 text-warningGold" /> Our Team
                    </h2>
                    <p className="text-secondaryText leading-relaxed">
                        We are a passionate group of sports enthusiasts, technology experts, and event management professionals.
                        Our diverse team works tirelessly to ensure the platform is robust, secure, and user-friendly,
                        providing an unparalleled experience for players, managers, and spectators alike.
                    </p>

                    <h2 className="text-xl font-bold text-white flex items-center gap-2 pt-4 border-t border-cardBorder">
                        <Mail className="w-5 h-5 text-white" /> Contact Us
                    </h2>
                    <ul className="space-y-2 text-secondaryText text-sm">
                        <li className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-white" /> Email: <a href="mailto:info@franchiseauction.com" className="text-white hover:underline">info@franchiseauction.com</a>
                        </li>
                        <li className="flex items-center gap-2">
                            <Phone className="w-4 h-4 text-white" /> Phone: +1 (555) 123-4567
                        </li>
                        <li className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-urgentRedText" /> Address: 123 Sports Arena Rd, City, Country
                        </li>
                        <li className="flex items-center gap-2">
                            <ExternalLink className="w-4 h-4 text-warningGold" /> Website: <a href="https://www.example.com" target="_blank" rel="noopener noreferrer" className="text-warningGold hover:underline">www.example.com</a>
                        </li>
                    </ul>
                </div>

                <div className="text-center pt-8 text-mutedText text-xs">
                    <p>This platform is a project developed for the Department of Computer Science &amp; Engineering, GSTU.</p>
                    <p className="mt-1">All rights reserved &copy; {new Date().getFullYear()}</p>
                </div>
            </main>
        </div>
    );
}
