import { Link } from 'react-router-dom';
import { Mail, Phone, MessageCircle } from 'lucide-react';
import Logo from '@/components/Logo';

export default function PublicFooter() {
  return (
    <footer className="bg-secondary text-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-14 grid gap-10 md:grid-cols-4">
        <div className="md:col-span-2">
          <Logo light />
          <p className="mt-4 text-sm text-white/60 max-w-sm leading-relaxed">
            Nigeria's all-in-one digital services platform. Airtime, data, electricity, cable TV, betting,
            virtual numbers, social growth and a trusted marketplace — all in one wallet.
          </p>
        </div>
        <div>
          <h4 className="text-sm font-semibold mb-4">Explore</h4>
          <ul className="space-y-2.5 text-sm text-white/60">
            <li><Link to="/services" className="hover:text-white transition-colors">Services</Link></li>
            <li><Link to="/how-it-works" className="hover:text-white transition-colors">How It Works</Link></li>
            <li><Link to="/register" className="hover:text-white transition-colors">Create Account</Link></li>
            <li><Link to="/login" className="hover:text-white transition-colors">Login</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold mb-4">Support</h4>
          <ul className="space-y-2.5 text-sm text-white/60">
            <li className="flex items-center gap-2"><Mail className="w-4 h-4" /> lemakcompany26@gmail.com</li>
            <li className="flex items-center gap-2"><Phone className="w-4 h-4" /> 09022143559</li>
            <li>
              <a href="https://wa.me/2349022143559" target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:text-white transition-colors">
                <MessageCircle className="w-4 h-4" /> WhatsApp Us
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-white/40">
          <span>© {new Date().getFullYear()} Lemak Connect. All rights reserved.</span>
          <span>Built for Nigerians. Fast. Secure. Reliable.</span>
        </div>
      </div>
    </footer>
  );
}