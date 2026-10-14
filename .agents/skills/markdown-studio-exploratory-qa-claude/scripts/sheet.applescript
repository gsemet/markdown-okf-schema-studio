on run argv
  set act to item 1 of argv
  tell application "System Events"
    repeat with p in (every process whose name is "Code")
      try
        set ws to (every window of p whose name contains "Extension Development Host")
        repeat with w in ws
          if (count of sheets of w) > 0 then
            set s to sheet 1 of w
            if act is "read" then
              set out to ""
              try
                repeat with t in (every static text of s)
                  set out to out & (value of t) & " | "
                end repeat
              end try
              repeat with b in (every button of s)
                set out to out & "[" & (name of b) & "] "
              end repeat
              return out
            else
              click button act of s
              return "clicked " & act
            end if
          end if
        end repeat
      end try
    end repeat
  end tell
  return "no sheet"
end run
