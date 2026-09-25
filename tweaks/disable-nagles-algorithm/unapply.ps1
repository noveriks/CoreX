try {
    $interfaces = Get-ChildItem "HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters\Interfaces" -ErrorAction Stop

    foreach ($interface in $interfaces) {
        $path = $interface.PSPath
        Remove-ItemProperty -Path $path -Name "TcpAckFrequency" -ErrorAction SilentlyContinue
        Remove-ItemProperty -Path $path -Name "TCPNoDelay" -ErrorAction SilentlyContinue
    }

    Remove-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" -Name "TcpAckFrequency" -ErrorAction SilentlyContinue
    Remove-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" -Name "TCPNoDelay" -ErrorAction SilentlyContinue
    Remove-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" -Name "TcpDelAckTicks" -ErrorAction SilentlyContinue

    Write-Host "Nagle's Algorithm restored"
} catch {
    Write-Host "Failed to restore Nagle's Algorithm: $_"
}
