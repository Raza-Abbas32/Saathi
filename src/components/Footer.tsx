import { Heart } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-saathi-900 text-saathi-50 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-10 h-10 rounded-xl bg-saathi-800 flex items-center justify-center overflow-hidden">
                <img src="/Logo/Logo.png" alt="Saathi logo" className="w-full h-full object-cover" />
              </div>
              <span className="text-xl font-bold">Saathi</span>
            </div>
            <p className="text-saathi-200 text-sm leading-relaxed max-w-xs">
              Empowering Pakistani farmers with AI-driven tools for smarter,
              more profitable, and sustainable farming.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-saathi-100 mb-4">Quick Links</h4>
            <ul className="space-y-2 text-sm text-saathi-200">
              <li>Disease Detection</li>
              <li>Crop Advisor</li>
              <li>Market Prices</li>
              <li>Marketplace</li>
              <li>Farming Assistant</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-saathi-100 mb-4">About</h4>
            <p className="text-saathi-200 text-sm leading-relaxed">
              Saathi is built for the Alibaba Cloud AI Hackathon Pakistan 2026
              — Smart Agriculture track, to bring modern AI tools to every
              farmer's fingertips.
            </p>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-saathi-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-saathi-300 text-sm">
            © 2026 Team Saathi. All rights reserved.
          </p>
          <p className="text-saathi-300 text-sm flex items-center gap-1.5">
            Made with <Heart className="w-4 h-4 text-saathi-400" /> for Pakistani
            farmers
          </p>
        </div>
      </div>
    </footer>
  );
}
