"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Users } from "lucide-react";

interface ActivationProgressCardProps {
  activatedCount: number;
  totalMembers: number;
}

export function ActivationProgressCard({
  activatedCount,
  totalMembers,
}: ActivationProgressCardProps) {
  const percentage = totalMembers > 0 ? Math.round((activatedCount / totalMembers) * 100) : 0;

  return (
    <Card className="border shadow-xs">
      <CardHeader className="p-4 pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            Progres Aktivasi Akun Mahasiswa
          </CardTitle>
          <Badge variant="secondary" className="text-xs font-semibold">
            {percentage}% Teraktivasi
          </Badge>
        </div>
        <CardDescription className="text-xs">
          Status aktivasi akun mahasiswa Kelas 1-B setelah pergantian password pertama kali.
        </CardDescription>
      </CardHeader>

      <CardContent className="p-4 pt-1 space-y-2.5">
        <div className="flex items-baseline justify-between text-xs">
          <div className="flex items-center gap-1.5 font-medium text-foreground">
            <Users className="h-3.5 w-3.5 text-muted-foreground" />
            <span>
              <strong>{activatedCount}</strong> dari {totalMembers} akun aktif
            </span>
          </div>
          <span className="text-[11px] text-muted-foreground">
            {totalMembers - activatedCount} belum aktivasi
          </span>
        </div>

        <Progress value={percentage} className="h-2.5" />

        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Akun mahasiswa secara otomatis diberi timestamp <code>activatedAt</code> permanen saat mereka berhasil
          melakukan login pertama dan mengganti password bawaan kelas.
        </p>
      </CardContent>
    </Card>
  );
}
