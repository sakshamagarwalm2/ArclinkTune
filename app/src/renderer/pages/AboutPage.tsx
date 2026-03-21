import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Github, Mail, ExternalLink, Sparkles, Code2 } from 'lucide-react'
import bannerImg from '../../assets/baner.png'

interface VersionInfo {
  version: string;
  buildDate: string;
  gitCommit: string;
}

export function AboutPage() {
  const [versionInfo, setVersionInfo] = useState<VersionInfo>({
    version: '1.0.0',
    buildDate: '',
    gitCommit: ''
  });

  useEffect(() => {
    fetch('/version.json')
      .then(res => res.json())
      .then(data => setVersionInfo(data))
      .catch(() => {
        setVersionInfo({ version: '1.0.0', buildDate: '', gitCommit: '' });
      });
  }, []);

  return (
    <div className="h-full flex flex-col gap-8 pb-12 animate-in fade-in duration-500">
      {/* Banner Section */}
      <div className="relative w-full h-64 md:h-80 rounded-3xl overflow-hidden shadow-neon-lg border border-primary/20">
        <img 
          src={bannerImg} 
          alt="ArclinkTune Banner" 
          className="w-full h-full object-cover grayscale-[20%] hover:grayscale-0 transition-all duration-700"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent flex flex-col justify-end p-8">
          <Badge className="w-fit mb-3 bg-primary/20 text-primary border-primary/30 backdrop-blur-md">
            v{versionInfo.version}
          </Badge>
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter brand-gradient-text drop-shadow-neon">
            ArclinkTune
          </h1>
          <p className="text-muted-foreground mt-2 max-w-xl text-sm md:text-base font-medium">
            The next generation of model fine-tuning interfaces. Built for performance, designed for excellence.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* About the App */}
        <Card className="glass-card border-primary/10 hover:border-primary/30 transition-all duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl italic font-serif">
              <Sparkles className="w-5 h-5 text-primary" />
              About the App
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-relaxed text-muted-foreground">
            <p>
              ArclinkTune is an **autonomous LLM fine-tuning studio** that revolutionizes how models are trained. 
              We integrate intelligent AI monitoring that automatically sets, tunes, and optimizes training parameters 
              in real-time, eliminating the manual hustle and complexity of traditional workflows.
            </p>
            <div className="flex flex-wrap gap-2 pt-2">
              <Badge variant="secondary" className="bg-muted/50">Autonomous Tuning</Badge>
              <Badge variant="secondary" className="bg-muted/50">AI Monitoring</Badge>
              <Badge variant="secondary" className="bg-muted/50">LoRA / QLoRA</Badge>
              <Badge variant="secondary" className="bg-muted/50">Real-time Optimization</Badge>
            </div>
            <div className="pt-4 border-t border-primary/5 flex items-center gap-2 text-xs font-semibold text-primary/80">
              <Sparkles className="w-3.5 h-3.5" />
              Powered by HKRM
            </div>
          </CardContent>
        </Card>

        {/* About the Creator */}
        <Card className="glass-card border-primary/10 hover:border-primary/30 transition-all duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl italic font-serif">
              <Code2 className="w-5 h-5 text-neon-cyan" />
              About the Creator
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-neon-purple p-[2px] shadow-neon-sm">
                <div className="w-full h-full rounded-full bg-background flex items-center justify-center font-bold text-xl text-primary">
                  AL
                </div>
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">AstralLink_</h3>
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-neon-green animate-pulse" />
                  AI Systems Architect
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-primary/5 group hover:border-primary/20 transition-all overflow-hidden">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 rounded-lg bg-background/50 text-muted-foreground group-hover:text-primary transition-colors shrink-0">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Email</p>
                    <p className="text-xs sm:text-sm font-medium truncate">sakshamagarwalm2@gmail.com</p>
                  </div>
                </div>
                <a href="mailto:sakshamagarwalm2@gmail.com" className="shrink-0">
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-primary/10">
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </a>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-primary/5 group hover:border-primary/20 transition-all overflow-hidden">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 rounded-lg bg-background/50 text-muted-foreground group-hover:text-neon-cyan transition-colors shrink-0">
                    <Github className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Github</p>
                    <p className="text-xs sm:text-sm font-medium truncate">sakshamagarwalm2</p>
                  </div>
                </div>
                <a href="https://github.com/sakshamagarwalm2/ArclinkTune" target="_blank" rel="noreferrer" className="shrink-0">
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-neon-cyan/10">
                    <ExternalLink className="w-4 h-4 text-neon-cyan" />
                  </Button>
                </a>
              </div>
            </div>

            <p className="text-xs text-center text-muted-foreground italic pt-4">
              "Architecting the future of autonomous model optimization."
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}