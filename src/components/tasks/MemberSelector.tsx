"use client";

import * as React from "react";
import { ChevronsUpDown, X, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

export interface MemberOption {
  id: string;
  name: string | null;
  email: string;
}

interface MemberSelectorProps {
  members: MemberOption[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  label?: string;
}

export function MemberSelector({ members, selectedIds, onChange, label }: MemberSelectorProps) {
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");

  const filteredMembers = React.useMemo(() => {
    if (!searchQuery.trim()) return members;
    const query = searchQuery.toLowerCase();
    return members.filter(
      (m) =>
        (m.name && m.name.toLowerCase().includes(query)) ||
        m.email.toLowerCase().includes(query)
    );
  }, [members, searchQuery]);

  const handleToggle = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((item) => item !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const handleSelectAll = () => {
    const allFilteredIds = filteredMembers.map((m) => m.id);
    const combined = Array.from(new Set([...selectedIds, ...allFilteredIds]));
    onChange(combined);
  };

  const handleClearAll = () => {
    onChange([]);
  };

  return (
    <div className="space-y-2">
      {label && <label className="text-xs font-medium text-foreground">{label}</label>}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              type="button"
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-full justify-between h-auto min-h-9 text-xs px-3 py-1.5 font-normal"
            >
              <div className="flex flex-wrap gap-1 items-center max-w-[90%] text-left">
                {selectedIds.length === 0 ? (
                  <span className="text-muted-foreground">Pilih mahasiswa (cari & multi-select)...</span>
                ) : (
                  <span className="font-medium text-foreground">
                    {selectedIds.length} mahasiswa terpilih
                  </span>
                )}
              </div>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          }
        />
        <PopoverContent className="w-[380px] p-0" align="start">
          <div className="p-2 border-b space-y-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Cari nama atau email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-xs"
              />
            </div>
            <div className="flex items-center justify-between text-xs px-1 text-muted-foreground">
              <span>Menampilkan {filteredMembers.length} dari {members.length} anggota</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="text-primary hover:underline text-[11px] font-medium"
                >
                  Pilih Semua
                </button>
                <span>•</span>
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="text-muted-foreground hover:text-foreground text-[11px]"
                >
                  Reset
                </button>
              </div>
            </div>
          </div>

          <div className="max-h-60 overflow-y-auto divide-y divide-border/40 p-1">
            {filteredMembers.length === 0 ? (
              <div className="py-6 text-center text-xs text-muted-foreground">
                Tidak ada mahasiswa yang cocok dengan pencarian.
              </div>
            ) : (
              filteredMembers.map((member) => {
                const isSelected = selectedIds.includes(member.id);
                return (
                  <div
                    key={member.id}
                    onClick={() => handleToggle(member.id)}
                    className={cn(
                      "flex items-center gap-2.5 px-2.5 py-1.5 rounded cursor-pointer text-xs transition-colors",
                      isSelected ? "bg-muted/80 font-medium" : "hover:bg-muted/40"
                    )}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => handleToggle(member.id)}
                      className="h-3.5 w-3.5"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="truncate text-xs">
                        {member.name || member.email.split("@")[0]}
                      </div>
                      <div className="text-[11px] text-muted-foreground truncate">
                        {member.email}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* Selected tags preview */}
      {selectedIds.length > 0 && (
        <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto pt-1">
          {selectedIds.slice(0, 10).map((id) => {
            const member = members.find((m) => m.id === id);
            if (!member) return null;
            return (
              <Badge
                key={id}
                variant="secondary"
                className="text-[11px] px-1.5 py-0.5 font-normal gap-1 h-5"
              >
                <span className="truncate max-w-[120px]">
                  {member.name || member.email.split("@")[0]}
                </span>
                <button
                  type="button"
                  onClick={() => handleToggle(id)}
                  className="hover:text-destructive shrink-0"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            );
          })}
          {selectedIds.length > 10 && (
            <Badge variant="outline" className="text-[11px] px-1.5 py-0.5 h-5">
              +{selectedIds.length - 10} lainnya
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
